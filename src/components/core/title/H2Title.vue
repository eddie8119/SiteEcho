<template>
  <div class="text-color-difference mb-2 w-full">
    <h2 class="text-lg font-medium capitalize" :class="props.className">{{ props.title }}</h2>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  className?: string;
}>();
</script>

<style lang="scss" scoped></style>
