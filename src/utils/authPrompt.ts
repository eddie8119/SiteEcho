export const LOGIN_REQUIRED_TOAST_EVENT = 'site-shot:login-required-toast';
export const LOGIN_REQUIRED_MESSAGE_KEY = 'message.login_required';
export const DEFAULT_LOGIN_REQUIRED_TOAST_DURATION = 1800;
export const DEFAULT_LOGIN_REQUIRED_REDIRECT_DELAY = 1200;

export type LoginRequiredToastVariant = 'success' | 'error' | 'info';

export interface LoginRequiredToastDetail {
  messageKey?: string;
  variant?: LoginRequiredToastVariant;
  durationMs?: number;
}

export interface LoginRequiredPromptOptions {
  messageKey?: string;
  toastDurationMs?: number;
  redirectDelayMs?: number;
  onAfterPrompt?: () => void | Promise<void>;
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });

export const emitLoginRequiredToast = (detail: LoginRequiredToastDetail = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<LoginRequiredToastDetail>(LOGIN_REQUIRED_TOAST_EVENT, {
      detail: {
        messageKey: LOGIN_REQUIRED_MESSAGE_KEY,
        variant: 'info',
        durationMs: DEFAULT_LOGIN_REQUIRED_TOAST_DURATION,
        ...detail,
      },
    })
  );
};

export const promptLoginRequired = async (options: LoginRequiredPromptOptions = {}) => {
  emitLoginRequiredToast({
    messageKey: options.messageKey ?? LOGIN_REQUIRED_MESSAGE_KEY,
    durationMs: options.toastDurationMs ?? DEFAULT_LOGIN_REQUIRED_TOAST_DURATION,
    variant: 'info',
  });

  await delay(options.redirectDelayMs ?? DEFAULT_LOGIN_REQUIRED_REDIRECT_DELAY);

  if (options.onAfterPrompt) {
    await options.onAfterPrompt();
  }
};
