<template>
  <div class="scrollbar-hide overflow-x-auto">
    <div class="flex min-w-max border-b">
      <router-link
        v-for="tab in finalTabs"
        :key="tab.name"
        :to="tab.to"
        class="whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors md:px-4"
        :class="[
          tab.isActive
            ? 'text-color-difference rounded-t-lg border-brand-primary font-medium'
            : 'hover:border-brand-primary/30 text-color-difference-hover border-transparent text-black-400',
        ]"
      >
        {{ t(`tab.${tab.name}`) }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { type RouteLocationRaw, useRoute } from 'vue-router';

import type { Tab } from '@/types/layout';

const props = defineProps<{
  subject: string;
  tabsList: Tab[];
}>();
const { t } = useI18n();
const route = useRoute();

const finalTabs = computed(() => {
  const firstSegment = route.path.split('/')[2]; // Changed from [1] to [2] for /app/ structure
  const currentId = typeof route.params.id === 'string' ? (route.params.id as string) : null;

  return props.tabsList
    .filter((tab) => !tab.requiresId || currentId)
    .map((tab) => {
      const routeName = `${firstSegment}-${tab.name}`;
      const to: RouteLocationRaw =
        tab.requiresId && currentId
          ? {
              name: routeName,
              params: { id: currentId },
            }
          : { name: routeName };
      const isActive = route.name === routeName;

      return {
        ...tab,
        to,
        isActive,
      };
    });
});
</script>

<style scoped></style>
