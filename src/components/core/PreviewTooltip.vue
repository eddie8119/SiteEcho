<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show && imageUrls.length > 0"
        class="panel-container fixed z-10 shadow-xl"
        :style="tooltipStyle"
      >
        <div class="space-y-2">
          <p class="text-color-difference text-xs font-semibold">
            {{ title }}
          </p>
          <div class="flex max-w-xs gap-2 overflow-x-auto">
            <img
              v-for="(url, index) in visibleImages"
              :key="`${url}-${index}`"
              :src="url"
              :alt="getAltText ? getAltText(index) : ''"
              class="h-20 w-20 flex-shrink-0 rounded border border-gray-200 object-cover"
            />
            <div
              v-if="extraCount > 0"
              class="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600"
            >
              +{{ extraCount }}
            </div>
          </div>
          <p class="text-color-difference text-xs">{{ hint }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  show: boolean;
  imageUrls: string[];
  title: string;
  hint: string;
  tooltipStyle?: Partial<Record<string, string>>;
  maxVisible?: number;
  getAltText?: (index: number) => string;
}

const props = withDefaults(defineProps<Props>(), {
  imageUrls: () => [],
  tooltipStyle: () => ({}),
  maxVisible: 3,
});

const visibleImages = computed(() => props.imageUrls.slice(0, props.maxVisible));
const extraCount = computed(() => Math.max(0, props.imageUrls.length - props.maxVisible));
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
