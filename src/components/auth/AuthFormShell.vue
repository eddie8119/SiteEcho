<template>
  <div class="auth-container">
    <div v-if="showHeaderActions" class="flex justify-end gap-2">
      <template v-for="action in headerActions" :key="action.id">
        <a
          v-if="action.type === 'link'"
          :href="action.href"
          target="_blank"
          :rel="action.rel"
          :aria-label="action.ariaLabel"
          class="flex items-center"
        >
          <span
            class="icon-hover icon-mask"
            :style="{
              WebkitMaskImage: `url(${getIconUrl(action.icon)})`,
              maskImage: `url(${getIconUrl(action.icon)})`,
              backgroundColor: isDarkMode
                ? 'var(--color-dark-primary-text)'
                : 'var(--color-primary-text)',
            }"
            :aria-label="`${action.ariaLabel}-Icon`"
            role="img"
          />
        </a>
        <HeaderNavActions v-if="action.type === 'dropdown'" :nav-items="action.navItems" />
      </template>
    </div>

    <div v-if="props.showLogo" class="flex items-center justify-center gap-3">
      <img src="@/assets/icons/CompanyLogo.png" alt="logo Icon" class="icon-logo w-[35px]" />
      <img src="@/assets/icons/SiteNearLogo.png" alt="logo Icon" class="icon-logo w-[120px]" />
    </div>

    <h2 class="mb-5 mt-2 text-center text-[24px] font-semibold">
      <slot name="title" />
    </h2>

    <p v-if="$slots.subtitle" class="-mt-2 mb-2 text-center text-[14px] text-gray-500">
      <slot name="subtitle" />
    </p>

    <slot />

    <ElButton
      v-if="props.showSubmitButton"
      type="primary"
      size="large"
      :loading="props.loading"
      :disabled="props.loading || props.isInvalid"
      block
      class="auth-brand-button w-full"
      @click="emit('submit')"
    >
      <slot name="button-text"> {{ t('button.submit') }}</slot>
    </ElButton>

    <div v-if="props.errorMessage" class="mt-2 text-center">
      <p class="text-secondary-red">{{ props.errorMessage }}</p>
    </div>

    <div v-if="props.message" class="mt-2 text-center">
      <p class="text-secondary-green">{{ props.message }}</p>
    </div>

    <div v-if="props.isSyncing" class="mt-4 text-center text-sm text-blue-700">
      <p>{{ t('message.syncing_cloud_data') }}</p>
      <p v-if="props.syncProgress.total > 0" class="mt-1 text-xs text-blue-600">
        {{
          t('message.sync_progress', {
            synced: props.syncProgress.synced,
            total: props.syncProgress.total,
          })
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import HeaderNavActions from '@/components/core/header/HeaderNavActions.vue';
import { useLocale } from '@/composables/useLocale';
import { BRAND_LINK } from '@/constants/link';
import { Language } from '@/types/language';
import { getIconUrl } from '@/utils/assetUrl';

const props = withDefaults(
  defineProps<{
    errorMessage?: string | null;
    message?: string | null;
    loading?: boolean;
    showLogo?: boolean;
    isInvalid?: boolean;
    showSubmitButton?: boolean;
    isSyncing?: boolean;
    syncProgress?: { synced: number; total: number };
  }>(),
  {
    errorMessage: '',
    message: '',
    showLogo: true,
    isInvalid: false,
    showSubmitButton: true,
    isSyncing: false,
    syncProgress: () => ({ synced: 0, total: 0 }),
  }
);

const emit = defineEmits<{
  (e: 'submit'): void;
}>();

const { t } = useI18n();
const route = useRoute();
const { languages, handleLanguageChange } = useLocale();
const isDarkMode = inject<Ref<boolean> | null>('isDarkMode', ref(false));

const handleLanguageSelect = (code: string): void => {
  handleLanguageChange(code as Language);
};

const showHeaderActions = computed(() =>
  ['login', 'register'].some((segment) => route.path.endsWith(`/${segment}`))
);

const headerActions = computed(() => [
  {
    id: 'website',
    type: 'link' as const,
    href: BRAND_LINK.website,
    rel: 'noopener noreferrer',
    ariaLabel: 'Website',
    icon: 'Website',
  },
  {
    id: 'instagram',
    type: 'link' as const,
    href: BRAND_LINK.instagramSiteNear,
    rel: 'noopener',
    ariaLabel: 'Instagram',
    icon: 'InstagramLogo',
  },
  {
    id: 'language',
    type: 'dropdown' as const,
    navItems: [
      {
        id: 1,
        name: 'Global',
        icon: 'Global',
        label: t('common.language'),
        action: handleLanguageSelect,
        dropdownItems: languages.map((lang) => ({
          label: lang.label,
          value: lang.code,
        })),
      },
    ],
  },
]);
</script>
