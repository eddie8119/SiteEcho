<template>
  <p class="hidden text-sm text-black-400 md:block">{{ formattedTime }}</p>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { formatDateTime } from '@/utils/date';
const formattedTime = ref<string>('');

let timer: ReturnType<typeof setInterval>;

const updateTime = (): void => {
  const now = new Date();
  formattedTime.value = formatDateTime(now);
};

// 注意這組件 是放在<keep-alive>之外的
onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped></style>
