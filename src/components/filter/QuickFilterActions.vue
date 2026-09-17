<template>
  <div class="quick-actions flex flex-wrap justify-end gap-2">
    <TextButton variant="quick" size="sm" @click="$emit('select-all')">
      <img src="@/assets/icons/Clear.svg" alt="Select" class="mr-1 h-4 w-4" />
      {{ selectAllLabel }}
    </TextButton>
    <TextButton variant="quick" size="sm" @click="$emit('clear-all')">
      <img src="@/assets/icons/Restore.svg" alt="Clear" class="mr-1 h-4 w-4" />
      {{ clearLabel }}
    </TextButton>
  </div>
</template>

<script setup lang="ts">
import TextButton from '@/components/core/button/TextButton.vue';

defineProps<{
  selectAllLabel: string;
  clearLabel: string;
}>();

defineEmits<{
  (e: 'select-all'): void;
  (e: 'clear-all'): void;
}>();
</script>
