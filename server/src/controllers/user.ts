import { Request, Response } from 'express';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { RegisterSnakeBody } from '@/types/requestBody';
import { AuthenticatedRequest } from '@/types/requests';
import { pickSnakeBody } from '@/utils/bodyTransform';
import { AppError, handleControllerError } from '@/utils/controllerError';
import { checkIsUserPaid } from '@/utils/storageGuard';
import { validatePasswordChange, validateRegistrationInput } from '@/utils/userValidation';

const REGISTER_FIELDS = ['email', 'password'] as const satisfies readonly (keyof RegisterSnakeBody &
  string)[];

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = pickSnakeBody<RegisterSnakeBody>(req, [...REGISTER_FIELDS]);

    if (!email || !password) {
      throw new AppError('Email and password are required', {
        statusCode: 400,
        code: 'REGISTRATION_MISSING_FIELDS',
      });
    }

    // 驗證輸入
    const validation = validateRegistrationInput(email, password);
    if (!validation.valid) {
      throw new AppError(validation.error ?? 'Invalid registration input', {
        statusCode: 400,
        code: 'REGISTRATION_INVALID_INPUT',
      });
    }

    // 使用 admin client 建立使用者
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // 需要驗證
      user_metadata: {},
    });

    if (signUpError || !authData.user) {
      if (
        signUpError?.message.includes('already exists') ||
        signUpError?.message.includes('A user with this email address has already been registered')
      ) {
        // Check if SSO user and provide clearer message
        try {
          // Query Supabase Auth for existing user with this email
          const { data: existingUsers, error: listError } =
            await supabaseAdmin.auth.admin.listUsers();

          if (listError) {
            throw new AppError('User with this email already exists', {
              statusCode: 409,
              code: 'USER_ALREADY_EXISTS',
            });
          } else if (existingUsers?.users) {
            const existingUser = existingUsers.users.find((user) => user.email === email);

            if (existingUser?.app_metadata?.provider) {
              const provider = existingUser.app_metadata.provider;
              const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

              // Return immediately with SSO error
              return res.status(409).json({
                success: false,
                message: `This email is already registered with ${providerName}. Please use ${providerName} to sign in.`,
                code: 'USER_EXISTS_WITH_SSO',
              });
            } else {
              throw new AppError('User with this email already exists', {
                statusCode: 409,
                code: 'USER_ALREADY_EXISTS',
              });
            }
          } else {
            throw new AppError('User with this email already exists', {
              statusCode: 409,
              code: 'USER_ALREADY_EXISTS',
            });
          }
        } catch (queryError) {
          // If query fails, fallback to original error message
          if (res.headersSent) {
            return;
          }
          throw queryError;
        }
      }
      throw new AppError(signUpError?.message || 'Failed to register user', {
        statusCode: 400,
        code: 'REGISTRATION_FAILED',
        detail: signUpError?.message,
      });
    }

    // Create profile record in Profiles table using admin client
    const { error: profileError } = await supabaseAdmin.from('Profiles').insert({
      id: authData.user.id,
      email: authData.user.email,
      is_developer: false,
      is_paid: false,
    });

    if (profileError) {
      console.error(
        '[register] Failed to create profile for user:',
        authData.user.id,
        profileError
      );
      // Continue with registration even if profile creation fails
      // The profile can be created later when needed
    }

    // 使用 Supabase 內建模板發送啟用郵件
    const redirectTo = `${process.env.CLIENT_URL}/auth/account-activation`;
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    const emailSent = !emailError;

    if (emailError) {
      console.warn(`[register] Failed to send invitation email to ${email}:`, emailError);
    }

    // Provide specific message for rate limit errors
    let message = emailSent
      ? 'User registered successfully. Please check your email to activate your account.'
      : 'User registered successfully, but failed to send activation email. Please check your email or request a new activation link.';

    if (emailError?.code === 'over_email_send_rate_limit' || emailError?.status === 429) {
      message =
        'User registered successfully. Due to email rate limits, the activation email may be delayed. Please check your inbox shortly or request a new activation link.';
    }

    res.status(201).json({
      success: true,
      data: {
        userId: authData.user.id,
        emailSent, // 告訊前端郵件是否成功
      },
      message,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Register error');
  }
};

// 獲取當前用戶信息
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user.id;

    // Return effective paid state (manual override + active subscription)
    const isPaid = await checkIsUserPaid(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          ispaid: isPaid, // 前端使用小寫 ispaid
        },
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get current user error');
  }
};

// 更新用戶信息 (僅限本人)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // 注意：用戶資料更新已移至 Supabase Auth user_metadata
    // 前端應使用 supabase.auth.updateUser 來更新用戶資料

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
      message: 'User metadata should be updated via Supabase Auth API',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Update user error');
  }
};

// 刪除用戶 (僅限本人)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const userId = user.id;

    // 使用 service-role client，確保帳號刪除流程不受 RLS 影響。
    // Photos 是以雙引號建立的大小寫敏感資料表，必須使用正確的表名。
    const { data: userPhotos, error: photosFetchError } = await supabaseAdmin
      .from('Photos')
      .select('file_path')
      .eq('user_id', userId);

    if (photosFetchError) {
      throw new AppError('Failed to fetch user photos', {
        statusCode: 500,
        code: 'USER_PHOTOS_FETCH_FAILED',
        detail: photosFetchError.message,
        exposeError: true,
      });
    }

    // 先刪除 Storage 檔案，再刪除 Photos 記錄，避免留下孤兒檔案。
    const filePaths = (userPhotos ?? []).map((photo) => photo.file_path).filter(Boolean);
    if (filePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('photos')
        .remove(filePaths);

      if (storageError) {
        throw new AppError('Failed to delete user photo files', {
          statusCode: 500,
          code: 'USER_PHOTO_FILES_DELETE_FAILED',
          detail: storageError.message,
          exposeError: true,
        });
      }
    }

    // 刪除所有照片（包括沒有 project_id 的照片）。
    const { error: photosDeleteError } = await supabaseAdmin
      .from('Photos')
      .delete()
      .eq('user_id', userId);

    if (photosDeleteError) {
      throw new AppError('Failed to delete user photos', {
        statusCode: 500,
        code: 'USER_PHOTOS_DELETE_FAILED',
        detail: photosDeleteError.message,
        exposeError: true,
      });
    }

    // Photos 已刪除後，再刪除用戶擁有的專案。
    const { error: projectsError } = await supabaseAdmin
      .from('Projects')
      .delete()
      .eq('user_id', userId);

    if (projectsError) {
      throw new AppError('Failed to delete user projects', {
        statusCode: 500,
        code: 'USER_PROJECTS_DELETE_FAILED',
        detail: projectsError.message,
        exposeError: true,
      });
    }

    // 明確刪除訂閱與 profile；其他以 profile/auth.users 為外鍵的資料會依資料庫級聯規則刪除。
    const { error: subscriptionsError } = await supabaseAdmin
      .from('UserSubscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionsError) {
      throw new AppError('Failed to delete user subscriptions', {
        statusCode: 500,
        code: 'USER_SUBSCRIPTIONS_DELETE_FAILED',
        detail: subscriptionsError.message,
        exposeError: true,
      });
    }

    const { error: profileError } = await supabaseAdmin.from('Profiles').delete().eq('id', userId);

    if (profileError) {
      throw new AppError('Failed to delete user profile', {
        statusCode: 500,
        code: 'USER_PROFILE_DELETE_FAILED',
        detail: profileError.message,
        exposeError: true,
      });
    }

    // 最後刪除 Supabase Auth user。
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      throw new AppError(deleteAuthError.message || 'Failed to delete auth user', {
        statusCode: 500,
        code: 'AUTH_USER_DELETE_FAILED',
        detail: deleteAuthError.message,
        exposeError: true,
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Delete user error');
  }
};

// 檢查用戶是否存在 (公開)
export const checkUserExists = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) {
      throw new AppError('Email is required', {
        statusCode: 400,
        code: 'EMAIL_REQUIRED',
      });
    }

    // 查詢 Supabase Auth 確認用戶是否存在
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Check user exists query error:', listError);
      throw new AppError('Error checking user existence.', {
        statusCode: 500,
        code: 'CHECK_USER_EXISTS_FAILED',
        detail: listError.message,
        exposeError: true,
      });
    }

    const userExists = existingUsers?.users?.some((user) => user.email === email) ?? false;

    res.json({
      success: true,
      data: {
        exists: userExists,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Check user exists error');
  }
};

// 要求重置密碼 (忘記密碼 - 發送重置郵件)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', {
        statusCode: 400,
        code: 'EMAIL_REQUIRED',
      });
    }

    // 使用 Supabase 內建的重置密碼流程
    // 由 Supabase 直接寄出郵件（使用 Dashboard 設定的模板）
    const redirectTo = `${process.env.CLIENT_URL}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    // 為了安全，即使出錯也返回成功（防止郵箱枚舉攻擊）
    if (error) {
      console.error('resetPasswordForEmail error:', error);
    }

    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Forgot password error');
  }
};

// 重置密碼 (忘記密碼 - 使用重置連結)
// 重置密碼 (忘記密碼 - 使用重置連結)
// 注意：此端點預期在用戶點擊郵件中的重置連結後，由前端在已驗證的 session 中呼叫
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword, newConfirmPassword } = req.body;

    // 驗證密碼
    const validation = validatePasswordChange(newPassword, newConfirmPassword);
    if (!validation.valid) {
      throw new AppError(validation.error ?? 'Invalid password input', {
        statusCode: 400,
        code: 'PASSWORD_VALIDATION_FAILED',
      });
    }

    // 使用從 'req.user' 來的 session 更新密碼，而不是 Admin API
    // 這需要前端在用戶點擊重置連結後，確保 Supabase client 處於已驗證狀態
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error('Reset password error:', error);
      throw new AppError(error.message || 'Failed to reset password. The link may have expired.', {
        statusCode: 400,
        code: 'RESET_PASSWORD_FAILED',
        detail: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Reset password error');
  }
};

// 更改密碼 (已登入用戶)
export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const { oldPassword, newPassword, newConfirmPassword } = req.body;

    if (!oldPassword) {
      throw new AppError('Old password is required', {
        statusCode: 400,
        code: 'OLD_PASSWORD_REQUIRED',
      });
    }

    // 驗證新密碼
    const validation = validatePasswordChange(newPassword, newConfirmPassword);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    // 驗證舊密碼 - 嘗試用舊密碼登入
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      throw new AppError('Old password is incorrect', {
        statusCode: 400,
        code: 'OLD_PASSWORD_INCORRECT',
        detail: signInError.message,
      });
    }

    // 更新密碼
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Change password error:', updateError);
      throw new AppError(updateError.message || 'Failed to change password', {
        statusCode: 400,
        code: 'CHANGE_PASSWORD_FAILED',
        detail: updateError.message,
      });
    }

    // Supabase 會自動發送密碼更改通知郵件
    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Change password error');
  }
};

// 激活帳戶 (驗證郵件)
export const activateAccount = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Activation token is required', {
        statusCode: 400,
        code: 'ACTIVATION_TOKEN_REQUIRED',
      });
    }

    // 使用 token 驗證郵件
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'signup',
      token,
      email: req.body.email,
    });

    if (error || !data.user) {
      console.error('Email verification error:', error);
      throw new AppError(error?.message || 'Invalid or expired activation token', {
        statusCode: 400,
        code: 'ACTIVATION_FAILED',
        detail: error?.message,
      });
    }

    // 驗證成功了，註戶已激活
    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      message: 'Email verified successfully. Your account is now active.',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Activate account error');
  }
};

// 重新發送激活郵件
export const resendActivation = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // 檢查用戶是否存在
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError || !existingUsers?.users?.some((user) => user.email === email)) {
      return res.json({
        success: true,
        message: 'If the email exists, a new activation link has been sent',
      });
    }

    // 使用 Supabase 內建郵件模板發送驗證郵件
    const redirectTo = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/account-activation`;

    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    const emailSent = !emailError;

    if (emailError) {
      console.warn(`[resendActivation] Failed to send invitation email to ${email}:`, emailError);
    }

    // Provide specific message for rate limit errors
    let message = emailSent
      ? 'Activation email sent successfully'
      : 'If the email exists, a new activation link has been sent';

    if (emailError?.code === 'over_email_send_rate_limit' || emailError?.status === 429) {
      message =
        'Due to email rate limits, the activation email may be delayed. Please check your inbox shortly or try again later.';
    }

    res.json({
      success: true,
      message,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Resend activation error');
  }
};
