export const roleNameMap: Record<string, string> = {
  viewer: '瀏覽者',
  editor: '編輯者',
  manager: '管理員',
};

export const formatDateTime = (date: string | number | Date, locale = 'zh-TW') => {
  try {
    return new Date(date).toLocaleString(locale);
  } catch {
    return '';
  }
};

export const container = (inner: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    ${inner}
  </div>
`;
