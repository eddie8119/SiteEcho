import { createI18n } from 'vue-i18n';

// import messages from './messages';
import enJson from '@/locales/en.json';
import zhTwJson from '@/locales/zh-TW.json';
import { Language } from '@/types/language';
import { LanguageLabels } from '@/types/language';

const getStoredLanguage = (): Language | null => {
  if (typeof window === 'undefined') return null;
  return (window.localStorage.getItem('language') as Language | null) ?? null;
};

const getBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined' || !navigator.language) return Language.EN;

  const normalized = navigator.language.toLowerCase();
  if (normalized.startsWith('zh')) return Language.ZH_TW;
  if (normalized.startsWith('en')) return Language.EN;
  return Language.EN;
};

const storedLanguage = getStoredLanguage();
const browserLanguage = getBrowserLanguage();
const defaultLocale = storedLanguage || browserLanguage || Language.ZH_TW;

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: defaultLocale,
  fallbackLocale: Language.EN,
  messages: {
    [Language.EN]: enJson,
    [Language.ZH_TW]: zhTwJson,
  },
});

export { Language, LanguageLabels };
export default i18n;
