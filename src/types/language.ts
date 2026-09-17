export enum Language {
  EN = 'en',
  ZH_TW = 'zh-TW',
}

//  語言標籤映射
export const LanguageLabels: Record<Language, string> = {
  [Language.EN]: 'English',
  [Language.ZH_TW]: '中文',
};

// 語言選項類型
export interface LanguageOption {
  code: Language;
  label: string;
}
