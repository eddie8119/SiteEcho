import { Request, Response } from 'express';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { LoginSchema } from '@/schemas/loginSchema';
import { RefreshRequestBody, SSOCallbackBody } from '@/types/requestBody';
import { pickSnakeBody } from '@/utils/bodyTransform';
import { AppError, handleControllerError } from '@/utils/controllerError';

const LOGIN_FIELDS = ['email', 'password'] as const satisfies readonly (keyof LoginSchema &
  string)[];

const REFRESH_FIELDS = ['refresh_token'] as const satisfies readonly (keyof RefreshRequestBody &
  string)[];

const SSO_CALLBACK_FIELDS = [
  'access_token',
  'refresh_token',
] as const satisfies readonly (keyof SSOCallbackBody & string)[];

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = pickSnakeBody<LoginSchema>(req, [...LOGIN_FIELDS]);

    if (!email || !password) {
      throw new AppError('Email and password are required', {
        statusCode: 400,
        code: 'AUTH_MISSING_CREDENTIALS',
      });
    }

    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session || !sessionData.user) {
      throw new AppError(signInError?.message || 'Invalid email or password', {
        statusCode: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
        detail: signInError?.message,
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.user_metadata?.name,
          createdAt: sessionData.user.created_at,
        },
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
      message: 'Login successful',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Login error');
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw new AppError('Logout failed', {
        statusCode: 500,
        code: 'AUTH_LOGOUT_FAILED',
        detail: error.message,
        exposeError: true,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Logout error');
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = pickSnakeBody<RefreshRequestBody>(req, [...REFRESH_FIELDS]);

    if (!refresh_token) {
      throw new AppError('Refresh token is required', {
        statusCode: 400,
        code: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      throw new AppError(error?.message || 'Invalid refresh token', {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        detail: error?.message,
      });
    }

    res.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      message: 'Token refreshed successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Refresh token error');
  }
};

// ==================== SSO 登入 ====================
export const ssoLogin = async (req: Request, res: Response) => {
  try {
    const { provider } = req.params as { provider: 'google' | 'facebook' | 'apple' };
    const { callbackUrl } = req.body as { callbackUrl?: string };

    if (!['google', 'facebook', 'apple'].includes(provider)) {
      throw new AppError('Invalid SSO provider', {
        statusCode: 400,
        code: 'INVALID_SSO_PROVIDER',
      });
    }

    // 使用前端傳遞的 callbackUrl，如果沒有則使用默認的 CLIENT_URL
    const redirectUrl = callbackUrl
      ? callbackUrl
      : `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/sso/callback`;

    // 生成 OAuth 授權 URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'facebook' | 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false, // Web 模式不需要 skipBrowserRedirect
      },
    });

    if (error || !data.url) {
      console.error('SSO login error:', error);
      throw new AppError(error?.message || 'Failed to generate SSO login URL', {
        statusCode: 500,
        code: 'SSO_LOGIN_URL_FAILED',
        detail: error?.message,
        exposeError: true,
      });
    }

    res.json({
      success: true,
      data: {
        url: data.url,
      },
      message: 'SSO login URL generated successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'SSO login error');
  }
};

export const ssoCallback = async (req: Request, res: Response) => {
  try {
    const { provider } = req.params as { provider: 'google' | 'facebook' | 'apple' };
    const { access_token, refresh_token } = pickSnakeBody<SSOCallbackBody>(req, [
      ...SSO_CALLBACK_FIELDS,
    ]);
    const accessToken = access_token;
    const refreshToken = refresh_token;

    if (!accessToken) {
      throw new AppError('Access token is required', {
        statusCode: 400,
        code: 'SSO_ACCESS_TOKEN_REQUIRED',
      });
    }

    if (!['google', 'facebook', 'apple'].includes(provider)) {
      throw new AppError('Invalid SSO provider', {
        statusCode: 400,
        code: 'INVALID_SSO_PROVIDER',
      });
    }

    // 使用 access token 從 Supabase 取得使用者資訊 (使用 admin client 驗證)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      console.error('SSO callback error:', userError);
      throw new AppError(userError?.message || 'SSO authentication failed', {
        statusCode: 401,
        code: 'SSO_AUTH_FAILED',
        detail: userError?.message,
      });
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new AppError('Email is required for SSO login', {
        statusCode: 400,
        code: 'SSO_EMAIL_REQUIRED',
      });
    }

    // Ensure profile record exists in Profiles table (using admin client to bypass RLS)
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('Profiles')
      .select('id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileCheckError || !existingProfile) {
      // Profile doesn't exist, create it using admin client
      const { error: profileInsertError } = await supabaseAdmin.from('Profiles').insert({
        id: userData.user.id,
        email: userEmail,
        is_developer: false,
        is_paid: false,
      });

      if (profileInsertError) {
        console.error(
          '[ssoCallback] Failed to create profile for user:',
          userData.user.id,
          profileInsertError
        );
        // Continue with SSO login even if profile creation fails
        // The profile can be created later when needed
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: userData.user.id,
          email: userData.user.email,
          name: userData.user.user_metadata?.name || userData.user.user_metadata?.full_name,
          avatar: userData.user.user_metadata?.avatar_url,
          provider: userData.user.app_metadata?.provider,
          createdAt: userData.user.created_at,
        },
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
      },
      message: 'SSO login successful',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'SSO callback error');
  }
};
