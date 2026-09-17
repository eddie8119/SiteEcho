/**
 * 用於處理表單錯誤的組合式函數，特別適用於處理 API 請求錯誤。
 *
 * @param {Object} options - 表單錯誤處理的配置選項
 * @param {number[]} options.statusCodes - 需要處理的 HTTP 狀態碼列表
 * @param {string} options.defaultErrorKey - 預設錯誤信息的國際化鍵值
 *
 * @returns {Object}
 * @returns {Ref<string | undefined>} errorMessage - 錯誤信息
 * @returns {Function} handleError - 處理 API 錯誤的函數
 * @returns {Function} clearError - 清除錯誤信息的函數
 */

import { ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { AxiosError } from 'axios';

interface FormErrorOptions {
  statusCodes: number[];
  defaultErrorKey: string;
}

interface UseFormErrorReturn {
  errorMessage: Ref<string | undefined>;
  handleError: (error: AxiosError) => void;
  setErrorMessage: (message: string) => void;
  clearError: () => void;
}

export function useFormError({
  statusCodes,
  defaultErrorKey,
}: FormErrorOptions): UseFormErrorReturn {
  const { t } = useI18n();

  const errorMessage = ref<string | undefined>(undefined);

  const handleError = (error: AxiosError) => {
    const err = error as {
      response?: {
        status: number;
        data: { message?: string; code?: string };
      };
    };
    if (err.response?.status && statusCodes.includes(err.response.status) && err.response?.data) {
      const errorData = err.response.data;

      // Handle SSO user error specifically
      if (errorData.code === 'USER_EXISTS_WITH_SSO' && errorData.message) {
        errorMessage.value = errorData.message;
      }
      // Handle other error formats - prefer message over code
      else if (errorData.message) {
        errorMessage.value = errorData.message;
      }
      // Fallback to joining all values for backward compatibility
      else if (typeof errorData === 'object' && errorData !== null) {
        const errorMessages = Object.values(errorData).flat().join('\n');
        errorMessage.value = errorMessages;
      } else {
        errorMessage.value = t(defaultErrorKey);
      }
    } else {
      errorMessage.value = t(defaultErrorKey);
    }
  };

  const setErrorMessage = (message: string) => {
    errorMessage.value = message;
  };

  const clearError = () => {
    errorMessage.value = undefined;
  };

  return {
    errorMessage,
    handleError,
    setErrorMessage,
    clearError,
  };
}
