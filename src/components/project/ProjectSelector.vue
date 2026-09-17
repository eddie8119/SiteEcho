<template>
  <div class="flex items-center gap-2">
    <img
      src="@/assets/icons/Category.svg"
      alt="Category"
      class="h-5 w-5"
      style="
        filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(347deg) brightness(98%)
          contrast(91%);
      "
    />
    <ProjectSelectorMenu
      :trigger-button-class="triggerButtonClass"
      :menu-container-class="menuContainerClass"
      @management-action="handleProjectManagement"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import ProjectSelectorMenu from './ProjectSelectorMenu.vue';

const props = withDefaults(defineProps<Props>(), {
  variant: 'photo-preview',
});

const Variants = {
  TIMELINE: 'timeline',
  PHOTO_PREVIEW: 'photo-preview',
} as const;

type Variant = (typeof Variants)[keyof typeof Variants];

interface Props {
  variant?: Variant;
  menuContainerClass?: string;
}

const router = useRouter();

const triggerButtonClass = computed(() => {
  if (props.variant === Variants.TIMELINE) {
    return 'flex cursor-pointer items-center justify-between gap-2 border-none bg-transparent p-0 text-xl font-bold text-gray-900 transition-opacity hover:opacity-70';
  }
  return 'flex min-w-40 cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/90 px-3 py-2 text-sm font-medium text-gray-900 backdrop-blur transition-all hover:border-white/30 hover:bg-white/95';
});

const menuContainerClass = computed(() => {
  if (props.menuContainerClass) {
    return props.menuContainerClass;
  }
  if (props.variant === Variants.TIMELINE) {
    return 'absolute left-0 right-auto top-full z-50 mt-2 max-h-96 min-w-60 overflow-hidden rounded-lg bg-white shadow-lg';
  }
  return 'absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-hidden rounded-lg bg-white shadow-lg';
});

const handleProjectManagement = () => {
  router.push('/mobile/project-management');
};

// Export for template usage
defineExpose({
  triggerButtonClass,
  menuContainerClass,

  handleProjectManagement,
});
</script>
