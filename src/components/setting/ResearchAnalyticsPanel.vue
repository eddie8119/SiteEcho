<template>
  <section>
    <H2Title title="Research" />
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
      <div class="space-y-1">
        <p>photosCreated: {{ analytics.photosCreated }}</p>
        <p>batchUsed: {{ analytics.batchUsed }}</p>
        <p>filterUsed: {{ analytics.filterUsed }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue';
import H2Title from '@/components/core/title/H2Title.vue';
import { getAnalytics, type AnalyticsData } from '@/utils/analytics';

const analytics = ref<AnalyticsData>(getAnalytics());

const refreshAnalytics = () => {
  analytics.value = getAnalytics();
};

onMounted(() => {
  refreshAnalytics();
});

onActivated(() => {
  refreshAnalytics();
});
</script>
