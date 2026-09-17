<template>
  <button
    class="flex h-6 w-6 items-center justify-center text-gray-600 transition-transform duration-300 hover:text-gray-800"
    @click="handleBack"
  >
    <span
      class="icon-hover icon-mask h-6 w-6"
      :style="{
        WebkitMaskImage: `url(${getIconUrl('back')})`,
        maskImage: `url(${getIconUrl('back')})`,
        backgroundColor: isDarkMode
          ? 'var(--color-dark-primary-text)'
          : 'var(--color-primary-text)',
      }"
      aria-label="back Icon"
      role="img"
    />
  </button>
</template>

<script setup lang="ts">
import { inject, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import { getIconUrl } from '@/utils/assetUrl';

const router = useRouter();

const isDarkMode = inject('isDarkMode') as Ref<boolean>;

const handleBack = () => {
  router.back();
};
</script>

<style scoped></style>
