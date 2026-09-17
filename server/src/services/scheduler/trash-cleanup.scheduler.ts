import * as cron from 'node-cron';

import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'photos';

type CronJob = ReturnType<typeof cron.schedule>;

// 垃圾桶清理排程器
// 每天 00:00 清理 30 天前的垃圾桶照片
export class TrashCleanupScheduler {
  private scheduledTask: CronJob | null = null;

  /**
   * 啟動排程器
   */
  start(): void {
    // 每天 00:00 執行
    const cronExpression = process.env.TRASH_CLEANUP_CRON || '0 0 * * *';

    this.scheduledTask = cron.schedule(
      cronExpression,
      async () => {
        await this.cleanupExpiredTrash();
      },
      {
        timezone: 'Asia/Taipei', // 使用台灣時區
      }
    );
  }

  /**
   * 停止排程器
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
    }
  }

  /**
   * 手動觸發清理
   * 可用於測試或手動清理
   */
  async manualTrigger(): Promise<{ success: boolean; deleted: number }> {
    return await this.cleanupExpiredTrash();
  }

  /**
   * 清理所有用戶過期的垃圾桶照片（30天前）
   * 1. 查找所有 deleted_at 超過 30 天的照片
   * 2. 從 Storage 刪除檔案
   * 3. 從資料庫刪除記錄
   */
  private async cleanupExpiredTrash(): Promise<{ success: boolean; deleted: number }> {
    try {
      // 找到 30 天前的日期
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 查找所有過期照片
      const { data: expiredPhotos, error: fetchError } = await supabaseAdmin
        .from('Photos')
        .select('id, file_path, user_id')
        .not('deleted_at', 'is', null)
        .lt('deleted_at', thirtyDaysAgo.toISOString());

      if (fetchError) {
        console.error('[TrashCleanupScheduler] 查詢過期照片失敗:', fetchError);
        return { success: false, deleted: 0 };
      }

      if (!expiredPhotos || expiredPhotos.length === 0) {
        return { success: true, deleted: 0 };
      }

      // 按用戶分組處理
      const photosByUser = new Map<string, typeof expiredPhotos>();
      for (const photo of expiredPhotos) {
        if (!photosByUser.has(photo.user_id)) {
          photosByUser.set(photo.user_id, []);
        }
        photosByUser.get(photo.user_id)!.push(photo);
      }

      let totalDeleted = 0;

      // 對每個用戶處理
      for (const [userId, photos] of photosByUser.entries()) {
        try {
          // 從 Storage 刪除檔案
          const filePaths = photos.map((p) => p.file_path);
          if (filePaths.length > 0) {
            await supabaseAdmin.storage.from(BUCKET).remove(filePaths);
          }

          // 從資料庫刪除記錄
          const { error: deleteError } = await supabaseAdmin
            .from('Photos')
            .delete()
            .eq('user_id', userId)
            .lt('deleted_at', thirtyDaysAgo.toISOString());

          if (deleteError) {
            console.error(
              `[TrashCleanupScheduler] 刪除用戶 ${userId} 的過期照片失敗:`,
              deleteError
            );
            continue;
          }

          totalDeleted += photos.length;
        } catch (error) {
          console.error(`[TrashCleanupScheduler] 處理用戶 ${userId} 時發生錯誤:`, error);
        }
      }

      return { success: true, deleted: totalDeleted };
    } catch (error) {
      console.error('[TrashCleanupScheduler] 清理過期垃圾桶照片時發生錯誤:', error);
      return { success: false, deleted: 0 };
    }
  }
}

export const trashCleanupScheduler = new TrashCleanupScheduler();
