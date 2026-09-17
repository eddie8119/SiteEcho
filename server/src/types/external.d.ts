/**
 * 外部模塊的類型聲明
 */

// line-notify-nodejs 模塊的類型聲明
declare module 'line-notify-nodejs' {
  export default class LineNotify {
    constructor(token: string);

    send(options: {
      message: string;
      imageThumbnail?: string;
      imageFullsize?: string;
      stickerPackageId?: number;
      stickerId?: number;
    }): Promise<{ status: number; message: string }>;
  }
}

// node-cron 模塊的類型聲明
declare namespace cron {
  interface ScheduledTask {
    start: () => void;
    stop: () => void;
  }

  interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
  }
}

declare module 'node-cron' {
  export function schedule(
    expression: string,
    func: () => void,
    options?: cron.ScheduleOptions
  ): cron.ScheduledTask;

  export function validate(expression: string): boolean;
}
