<template>
  <RouterLink
    v-if="props.to"
    :to="props.to"
    class="chart-text-color-difference no-active-bg truncate underline"
    v-bind="$attrs"
  >
    <slot />
  </RouterLink>
  <span v-else class="chart-text-color-difference truncate" v-bind="$attrs">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { type RouteLocationRaw } from 'vue-router';

const props = defineProps<{ to?: RouteLocationRaw | null }>();
</script>

<style scoped>
.no-active-bg.router-link-active,
.no-active-bg.router-link-exact-active {
  background-color: transparent !important;
}
</style>
