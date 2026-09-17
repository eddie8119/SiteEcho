<template>
  <!-- Background Mask -->
  <div
    v-show="modelValue"
    class="bg-black/60 fixed inset-0 z-[60] backdrop-blur-sm transition-opacity duration-300"
    @click="emit('update:modelValue', false)"
  />

  <Teleport to="body">
    <Transition name="sheet-slide">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[70] flex flex-col justify-end"
        @click.self="emit('update:modelValue', false)"
      >
        <!-- Sheet -->
        <div
          class="relative z-10 flex max-h-[90vh] flex-col rounded-t-2xl bg-white px-6 pb-10 pt-4 shadow-xl"
        >
          <!-- Handle -->
          <div class="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-gray-200" />

          <div class="mb-6 flex flex-col items-center text-center">
            <h2 class="mb-2 text-xl font-bold text-gray-900">{{ title }}</h2>
            <p class="text-gray-500">
              {{ description }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-3">
            <TextButton variant="primary" size="md" full-width @click="handleUpgrade">
              查看訂閱方案
            </TextButton>

            <button
              class="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
              @click="emit('update:modelValue', false)"
            >
              稍後再說
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

import TextButton from '@/components/core/button/TextButton.vue';

defineProps<{
  modelValue: boolean;
  title: string;
  description: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const router = useRouter();

const handleUpgrade = () => {
  emit('update:modelValue', false);
  router.push({ name: 'pricing-menu' });
};
</script>

<style scoped>
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
