export const ALERT_BANNER_VARIANT = {
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
  ERROR: 'error',
} as const;

export type AlertBannerVariant = (typeof ALERT_BANNER_VARIANT)[keyof typeof ALERT_BANNER_VARIANT];
