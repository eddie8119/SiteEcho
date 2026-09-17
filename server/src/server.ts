import './app';
import { trashCleanupScheduler } from './services/scheduler/trash-cleanup.scheduler';

// 啟動垃圾桶清理排程服務
trashCleanupScheduler.start();

// 處理應用關閉時停止排程服務
process.on('SIGINT', () => {
  trashCleanupScheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  trashCleanupScheduler.stop();
  process.exit(0);
});
