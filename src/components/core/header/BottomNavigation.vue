<template>
  <nav
    :class="[
      'fixed',
      'left-4',
      'right-4',
      'z-50',
      'rounded-3xl',
      'border',
      'border-gray-200',
      'bg-white',
      'shadow-[0_-4px_12px_rgba(0,0,0,0.1)]',
    ]"
    :style="navigationStyle"
  >
    <div class="mx-auto flex max-w-full items-center justify-around">
      <router-link
        v-for="item in APP_NAV_ITEMS"
        :key="item.name"
        :to="item.path"
        class="relative flex min-w-[60px] flex-col items-center justify-center px-4 py-1 text-gray-600 transition-all duration-200 active:scale-95"
        :class="{
          'text-brand-primary': isActiveRoute(item.path),
          'text-gray-600': !isActiveRoute(item.path),
        }"
      >
        <div
          class="mb-0.5 flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200"
          :class="{
            'bg-orange-50': isActiveRoute(item.path),
          }"
        >
          <span
            class="icon-mask h-6 w-6"
            :style="{
              WebkitMaskImage: `url(${item.icon})`,
              maskImage: `url(${item.icon})`,
              backgroundColor: isActiveRoute(item.path)
                ? 'var(--color-brand-primary)'
                : 'var(--color-black-500)',
            }"
            :aria-label="`${item.name}-Icon`"
            role="img"
          />
        </div>
        <span
          class="text-color-difference text-center text-xs leading-none"
          :class="{
            'text-brand-primary': isActiveRoute(item.path),
          }"
          >{{ $t('nav.menu.' + item.name) }}</span
        >
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { APP_NAV_ITEMS } from '@/constants/menu';
import { detectDevice } from '@/utils/deviceDetector';

const route = useRoute();
const device = detectDevice();

const isActiveRoute = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/');
};

const navigationStyle = computed(() => {
  // iPhone needs more bottom offset to be closer to screen edge
  if (device.isIOS && device.isMobile) {
    return {
      bottom: 'calc(0.25rem + env(safe-area-inset-bottom, 0px))',
    };
  }
  // iPad and other devices use the original offset
  return {
    bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
  };
});
</script>

<style scoped>
/* Keep the pill comfortably above the home indicator while preserving the design height. */
nav {
  padding: 0.5rem 0 0.75rem;
}

/* Icon mask styling - similar to NavBar */
.icon-mask {
  display: inline-block;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

/* Responsive design for smaller screens */
@media (max-width: 380px) {
  .min-w-\[60px\] {
    min-width: 50px;
  }

  .text-xs {
    font-size: 0.6875rem;
  }
}
</style>
