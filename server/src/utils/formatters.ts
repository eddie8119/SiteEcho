import camelcaseKeys from 'camelcase-keys';

const camelToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const convertToSnakeCase = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map((v) => convertToSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (acc, key) => {
        const newKey = camelToSnakeCase(key);
        acc[newKey] = convertToSnakeCase((obj as Record<string, unknown>)[key]);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }
  return obj;
};

type AnyRecord = Record<string, unknown>;

export const sanitizeAndCamelcase = <T extends AnyRecord>(
  record: T | null | undefined,
  fieldsToStrip: string[] = ['user_id']
) => {
  if (!record) return null;

  const sanitized: AnyRecord = { ...record };
  for (const field of fieldsToStrip) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  return camelcaseKeys(sanitized, { deep: true }) as unknown;
};

export const mapSanitizeCamelcase = <T extends AnyRecord>(
  records: T[] | null | undefined,
  fieldsToStrip: string[] = ['user_id']
) => {
  if (!records || records.length === 0) return [] as unknown[];

  return records.map((record) => sanitizeAndCamelcase(record, fieldsToStrip)) as unknown[];
};
