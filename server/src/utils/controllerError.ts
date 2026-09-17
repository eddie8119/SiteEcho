import type { Response } from 'express';

type AppErrorOptions = {
  statusCode?: number;
  code?: string;
  exposeError?: boolean;
  detail?: string;
};

export class AppError extends Error {
  statusCode: number;
  code?: string;
  exposeError?: boolean;
  detail?: string;

  constructor(message: string, options?: AppErrorOptions) {
    super(message);
    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code;
    this.exposeError = options?.exposeError ?? false;
    this.detail = options?.detail;
  }
}

type ErrorWithMessage = {
  message: string;
};

const hasMessage = (error: unknown): error is ErrorWithMessage =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof (error as ErrorWithMessage).message === 'string';

export function handleControllerError(
  res: Response,
  error: unknown,
  contextMessage: string,
  defaultStatus = 500
) {
  // 1. log：永遠包含 context
  console.error(contextMessage, error);

  // 2. 解析錯誤
  let status = defaultStatus;
  let message = 'An unexpected error occurred';
  let code: string | undefined;
  let detailedError: string | undefined;

  if (error instanceof AppError) {
    status = error.statusCode;
    message = error.message;
    code = error.code;
    if (error.exposeError) {
      detailedError = error.detail ?? error.message;
    }
  } else if (hasMessage(error)) {
    // 一般 Error
    message = error.message;
    detailedError = error.message;
  }

  // 3. 回傳統一格式
  return res.status(status).json({
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(detailedError ? { error: detailedError } : {}),
  });
}
