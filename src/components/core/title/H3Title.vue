<template>
  <div class="text-color-difference nowrap">
    <h3 class="text-base font-medium" :class="props.className">{{ props.title }}</h3>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  className?: string;
}>();
</script>

<style lang="scss" scoped></style>
