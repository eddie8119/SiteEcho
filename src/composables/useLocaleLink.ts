import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { BRAND_LINK } from '@/constants/link';
import { Language } from '@/types/language';

export function useLocaleLink() {
  const { locale } = useI18n();

  const notionManualLink = computed(() =>
    locale.value === Language.ZH_TW ? BRAND_LINK.notionManualTW : BRAND_LINK.notionManualEN
  );

  return {
    notionManualLink,
  };
}
