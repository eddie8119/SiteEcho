<template>
  <div class="fixed bottom-6 right-6 z-[998] flex flex-col items-end">
    <TransitionGroup
      v-if="isMenuOpen"
      name="fab-option"
      tag="div"
      class="mb-3 flex flex-col items-end gap-3"
    >
      <div
        v-for="action in actions"
        :key="action.key"
        class="group relative"
        @mouseenter="hoveredActionKey = action.key"
        @mouseleave="hoveredActionKey = null"
      >
        <button
          class="baseFabButton h-12 w-12"
          :aria-label="action.ariaLabel"
          @click="action.onClick"
        >
          <img :src="action.icon" :alt="action.alt" class="h-5 w-5" />
        </button>
        <Tooltip
          :text="action.tooltip"
          :visible="hoveredActionKey === action.key"
          position="left"
        />
      </div>
    </TransitionGroup>

    <button
      class="baseFabButton h-14 w-14"
      :aria-label="isMenuOpen ? 'Close quick actions' : 'Open quick actions'"
      :aria-expanded="isMenuOpen"
      @click="toggleMenu"
    >
      <img
        src="@/assets/icons/Stack.svg"
        alt="Quick actions"
        class="h-6 w-6 transition-transform duration-200"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import LightningIcon from '@/assets/icons/Lightning.svg';
import PlanIcon from '@/assets/icons/Plan.svg';
import Tooltip from '@/components/ui/Tooltip.vue';
import { useResponsiveWidth } from '@/composables/ui/useResponsiveWidth';
import { useSlideStore } from '@/stores/useSlideStore';
const slideStore = useSlideStore();
const { toggleQuickDraftSlide, toggleQuickPlanSlide } = slideStore;
const { isMobile } = useResponsiveWidth();
const { t } = useI18n();
const route = useRoute();

// 桌機預設打開，手機預設收起
const isMenuOpen = ref(false);
const hoveredActionKey = ref<string | null>(null);

onMounted(() => {
  isMenuOpen.value = !isMobile.value;
});

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const handleQuickDraftClick = () => {
  toggleQuickDraftSlide();
  // isMenuOpen.value = false;
};

const handleQuickPlanClick = () => {
  toggleQuickPlanSlide();
  // isMenuOpen.value = false;
};

const baseActions = [
  {
    key: 'quick-plan',
    icon: PlanIcon,
    alt: 'Quick Plan',
    ariaLabel: 'Open Quick Plan',
    tooltip: t('title.plan'),
    onClick: handleQuickPlanClick,
  },
  {
    key: 'quick-draft',
    icon: LightningIcon,
    alt: 'Quick Draft',
    ariaLabel: 'Open Quick Draft',
    tooltip: t('title.quick_draft'),
    onClick: handleQuickDraftClick,
  },
];

const actions = computed(() => {
  if (route.path === '/app/quick_draft') {
    return baseActions.filter((action) => action.key !== 'quick-draft');
  }
  return baseActions;
});
</script>

<style scoped>
.fab-option-enter-active,
.fab-option-leave-active {
  transition: all 0.2s ease-out;
}

.fab-option-enter-from,
.fab-option-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.9);
}

.fab-option-enter-to,
.fab-option-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.baseFabButton {
  @apply relative flex items-center justify-center rounded-full bg-brand-primary text-white transition-all duration-300 hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-white/40;

  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.baseFabButton:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
</style>
