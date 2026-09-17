import { Request } from 'express';
import snakecaseKeys from 'snakecase-keys';

/**
 * 將 req.body 轉成 snake_case，並只保留允許的欄位。
 *
 * T 用來描述回傳物件的型別，keys 則是允許的欄位名稱（已是 snake_case）。
 */
export const pickSnakeBody = <T extends Record<string, unknown>>(
  req: Request,
  keys: readonly (keyof T & string)[]
): Partial<T> => {
  const snakeBody = snakecaseKeys(req.body, { deep: true }) as T;
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(snakeBody, key)) {
      result[key] = snakeBody[key];
    }
  }

  return result as T;
};
