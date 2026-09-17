<template>
  <div class="mb-1 block font-medium dark:text-white" :class="props.className">
    <p>{{ title }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  className?: string;
}>();
</script>

<style lang="scss" scoped></style>
