<template>
  <label class="text200-color-difference mb-2 font-medium" :class="props.className">{{
    props.label
  }}</label>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string;
  className?: string;
}>();
</script>

<style lang="scss" scoped></style>
