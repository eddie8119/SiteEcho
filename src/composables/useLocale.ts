/**
 * 用於管理應用程序的語言設置和切換功能。
 * 提供語言選擇下拉選單的狀態管理和語言切換功能。
 *
 * @returns {Object}
 * @returns {Ref<Language>} currentLanguage - 當前選擇的語言
 * @returns {LanguageItem[]} languages - 可用的語言選項列表
 * @returns {Function} handleLanguageChange - 處理語言變更並更新相關設置
 */

import { ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { Language } from '@/i18n';
import router from '@/router';
import { syncDocumentMeta } from '@/utils/seoMeta';

interface LanguageItem {
  code: Language;
  label: string;
}

interface UseLocaleReturn {
  currentLanguage: Ref<Language>;
  languages: LanguageItem[];
  handleLanguageChange: (value: Language) => void;
}

export const useLocale = (): UseLocaleReturn => {
  const { locale, t } = useI18n();
  const currentLanguage = ref<Language>(locale.value as Language);

  const languages: LanguageItem[] = [
    { code: Language.ZH_TW, label: t('dropdown.zh-TW') },
    { code: Language.EN, label: t('dropdown.en') },
    // { code: Language.JA, label: t('dropdown.ja') },
  ];

  const handleLanguageChange = (value: Language) => {
    locale.value = value;
    currentLanguage.value = value;
    localStorage.setItem('language', value);
    document.documentElement.lang = value; //識別網站語言
    syncDocumentMeta(router.currentRoute.value);
  };

  return {
    currentLanguage,
    languages,
    handleLanguageChange,
  };
};
