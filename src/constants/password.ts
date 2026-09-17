export const PASSWORD_RULES = {
  min: 6,
  hasUpperCase: /[A-Z]/,
  hasSpecialChar: /[!@#$%^&*]/,
  hasAlphaNumeric: /[0-9a-zA-Z]/,
} as const;
