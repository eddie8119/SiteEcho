<template>
  <div class="flex h-full min-w-0 flex-col">
    <!-- Header Section -->
    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <H1Title :title="subject || ''" />
        <p v-if="subtitle" class="text-color-difference">{{ subtitle }}</p>
      </div>
      <component :is="tabComponent" :subject="subject || ''" :tabs-list="tabsList" />
    </div>

    <!-- Content Section -->
    <section class="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Tab } from '@/types/layout';

import H1Title from '@/components/core/title/H1Title.vue';

defineProps<{
  subject?: string;
  title?: string;
  subtitle?: string;
  tabsList: Tab[];
  tabComponent: unknown;
}>();
</script>

<style scoped></style>
