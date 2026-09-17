/**
 * Generic API response type for consistent typing across the application
 */
export type ApiResponse<T> =
  | {
      success: true;
      data?: T;
      message?: string;
    }
  | {
      success: false;
      data?: T;
      message: string;
      code?: string;
    };

// ApiResult
export type ApiResult = ApiResponse<undefined>;
