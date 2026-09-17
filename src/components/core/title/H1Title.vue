<template>
  <div class="text-color-difference w-full">
    <h1 class="text-2xl font-bold capitalize" :class="props.className">{{ props.title }}</h1>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  className?: string;
}>();
</script>

<style lang="scss" scoped></style>
