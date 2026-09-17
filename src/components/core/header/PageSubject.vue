<template>
  <!-- <H1Title :title="props.title ?? props.subject" /> -->
  <p class="text-xl">{{ t(`title.${pageSubject}`) }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const route = useRoute();

const pageSubject = computed(() => {
  return route.path.split('/')[1];
});

const { t } = useI18n();
</script>

<style scoped></style>
