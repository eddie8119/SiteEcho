<template>
  <div class="flex h-screen flex-col">
    <MobileHeader :title="title" :show-back="showBack" :on-back="onBack">
      <template #back-icon>
        <slot name="back-icon" />
      </template>
      <template #left>
        <slot name="header-left" />
      </template>
      <template #center>
        <slot name="header-center" />
      </template>
      <template #right>
        <slot name="header-right" />
      </template>
    </MobileHeader>
    <div class="flex-1 overflow-y-auto">
      <div class="mobile-page-container">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MobileHeader from '@/components/core/header/MobileHeader.vue';

interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

withDefaults(defineProps<Props>(), {
  showBack: true,
  onBack: undefined,
});
</script>
