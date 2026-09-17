export const toSafeNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numberValue) ? 0 : numberValue;
};

export const parseNumberInput = (input: string) => {
  const sanitized = input.replace(/,/g, '');
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const formatNumberWithCommas = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toLocaleString();
};

export const parseUnknownNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const normalized =
    typeof value === 'string' ? value.replace(/,/g, '').trim() : (value as string | number);
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : null;
};
