import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { loginSchema } from '@/schemas/loginSchema';
import { registerSchema } from '@/schemas/registerSchema';

export const validateAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 根據路徑選擇適當的 schema
    const schema = req.path.includes('register') ? registerSchema : loginSchema;

    // 驗證請求體
    await schema.parseAsync(req.body);

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    // For other unexpected errors
    console.error('Unexpected validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
    });
  }
};
