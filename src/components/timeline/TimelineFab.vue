<template>
  <div class="fixed bottom-36 right-6 z-[50] flex flex-col items-end">
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
          class="baseFabButton h-10 w-10"
          :aria-label="action.ariaLabel"
          @click="handleActionClick(action)"
        >
          <img :src="action.icon" :alt="action.alt" class="h-5 w-5" />
        </button>
        <div
          v-if="hoveredActionKey === action.key"
          class="absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg"
        >
          {{ action.label }}
        </div>
      </div>
    </TransitionGroup>

    <button
      class="baseFabButton h-12 w-12"
      :aria-label="isMenuOpen ? 'Close menu' : 'Open menu'"
      :aria-expanded="isMenuOpen"
      @click="toggleMenu"
    >
      <img
        src="@/assets/icons/Add.svg"
        alt="Add"
        class="h-6 w-6 transition-transform duration-200"
        :class="{ 'rotate-45': isMenuOpen }"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import UploadIcon from '@/assets/icons/Upload.svg';

interface FabAction {
  key: string;
  icon: string;
  alt: string;
  ariaLabel: string;
  label: string;
  onClick: () => void;
}

interface Props {
  onImportClick: () => void;
}

const props = defineProps<Props>();

const { t } = useI18n();
const isMenuOpen = ref(false);
const hoveredActionKey = ref<string | null>(null);

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const actions: FabAction[] = [
  {
    key: 'import',
    icon: UploadIcon,
    alt: 'Import',
    ariaLabel: 'Import from gallery',
    label: t('timeline.import_from_gallery'),
    onClick: () => {
      props.onImportClick();
    },
  },
];

const handleActionClick = (action: FabAction) => {
  action.onClick();
  isMenuOpen.value = false;
};
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
  @apply relative flex items-center justify-center rounded-full bg-brand-secondary text-white transition-all duration-300 hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-white/40;

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
