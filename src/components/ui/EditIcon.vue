<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :class="size + ' text-gray-500'"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="1.5"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.313l-4.5 1.125 1.125-4.5L16.862 3.487z"
    />
  </svg>
</template>

<script setup lang="ts">
const { size = 'h-5 w-5' } = defineProps<{
  size?: string;
}>();
</script>
