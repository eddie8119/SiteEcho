<template>
  <div class="space-y-6">
    <section class="space-y-4">
      <TextButton
        v-for="action in accountActions"
        :key="action.key"
        variant="ghost"
        size="md"
        full-width
        :class="action.className"
        type="button"
        @click="action.onClick"
      >
        {{ action.label }}
      </TextButton>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import TextButton from '@/components/core/button/TextButton.vue';

const { t } = useI18n();
const router = useRouter();

const accountActions = computed(() => [
  {
    key: 'change-password',
    label: t('title.change_password'),
    onClick: () => {
      sessionStorage.setItem('settingTab', 'account');
      router.push({ name: 'mobile-change-password' });
    },
    className: 'border-gray-300 text-gray-800 hover:bg-gray-50',
  },
  {
    key: 'privacy',
    label: t('setting.privacy'),
    onClick: () => {
      sessionStorage.setItem('settingTab', 'account');
      router.push('/privacy');
    },
    className: 'border-gray-300 text-gray-800 hover:bg-gray-50',
  },
  {
    key: 'delete-account',
    label: t('setting.deleteAccount'),
    onClick: () => {
      sessionStorage.setItem('settingTab', 'account');
      router.push('/delete-account');
    },
    className: 'border-red-200 text-red-600 hover:bg-red-50',
  },
]);
</script>
