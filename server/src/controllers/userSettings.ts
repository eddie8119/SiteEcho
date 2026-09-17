import camelcaseKeys from 'camelcase-keys';
import { Request, Response } from 'express';

import { supabaseAdmin } from '@/lib/supabase';
import { UserSettingsSnakeBody } from '@/types/requestBody';
import { AuthenticatedRequest } from '@/types/requests';
import { pickSnakeBody } from '@/utils/bodyTransform';
import { AppError, handleControllerError } from '@/utils/controllerError';

const USER_SETTINGS_FIELDS = [
  'line_notify_token',
  'email_notifications_enabled',
  'line_notifications_enabled',
] as const satisfies readonly (keyof UserSettingsSnakeBody & string)[];

// 獲取用戶的通知設置
export const getUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;

    // 查詢用戶設置
    const { data, error } = await reqSupabase
      .from('UserSettings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 表示沒有找到記錄，這不是錯誤
      throw new AppError('獲取用戶設置失敗', {
        statusCode: 500,
        code: 'USER_SETTINGS_FETCH_FAILED',
      });
    }

    // 如果沒有找到設置，返回默認設置
    if (!data) {
      return res.status(200).json({
        success: true,
        data: {
          userId,
          lineNotifyToken: null,
          emailNotificationsEnabled: true,
          lineNotificationsEnabled: true,
        },
      });
    }

    // 移除敏感字段並轉換為駝峰命名
    const settings = { ...data };
    delete settings.user_id;
    const safeSettings = camelcaseKeys(settings);

    return res.status(200).json({
      success: true,
      data: {
        ...safeSettings,
        userId,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get user settings error');
  }
};

// 更新用戶的通知設置
export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    const { line_notify_token, email_notifications_enabled, line_notifications_enabled } =
      pickSnakeBody<UserSettingsSnakeBody>(req, [...USER_SETTINGS_FIELDS]);

    // 檢查用戶設置是否已存在
    const { data: existingSettings, error: fetchError } = await reqSupabase
      .from('UserSettings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new AppError('查詢用戶設置失敗', {
        statusCode: 500,
        code: 'USER_SETTINGS_FETCH_FAILED',
      });
    }

    let result;
    const settingsPayload = {
      line_notify_token,
      email_notifications_enabled,
      line_notifications_enabled,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (existingSettings) {
      // 更新現有設置
      result = await reqSupabase.from('UserSettings').update(settingsPayload).eq('user_id', userId);
    } else {
      // 創建新設置
      result = await reqSupabase.from('UserSettings').insert([settingsPayload]);
    }

    if (result.error) {
      throw new AppError('更新用戶設置失敗', {
        statusCode: 500,
        code: 'USER_SETTINGS_UPDATE_FAILED',
      });
    }

    return res.status(200).json({
      success: true,
      message: '成功更新用戶設置',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Update user settings error');
  }
};
