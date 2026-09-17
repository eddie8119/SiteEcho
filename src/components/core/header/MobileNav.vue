<template>
  <!-- 漢堡 Icon -->
  <span
    class="icon-hover icon-mask md:hidden"
    :style="{
      WebkitMaskImage: `url(${getIconUrl('Hamburger')})`,
      maskImage: `url(${getIconUrl('Hamburger')})`,
      backgroundColor: isDarkMode ? 'var(--color-dark-primary-text)' : 'var(--color-primary-text)',
    }"
    :aria-label="`Hamburger-Icon`"
    role="img"
    @click="toggleHamburger"
  />

  <!-- 背景遮罩 -->
  <div
    v-show="isHamburgerOpen"
    class="bg-black/60 fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300"
    @click="toggleHamburger"
  />

  <!-- 下滑式導航 -->
  <Transition name="slide-down">
    <div
      v-if="isHamburgerOpen"
      class="background-color-difference fixed left-0 top-[60px] z-50 w-full rounded-b-2xl shadow-lg dark:bg-black-900"
    >
      <!-- Header -->
      <div
        class="dark:border-black-700 flex items-center justify-end border-b border-black-100 px-4 py-3"
      >
        <span
          class="icon-hover icon-mask w-6 cursor-pointer md:hidden"
          :style="{
            WebkitMaskImage: `url(${getIconUrl('Close')})`,
            maskImage: `url(${getIconUrl('Close')})`,
            backgroundColor: isDarkMode
              ? 'var(--color-dark-primary-text)'
              : 'var(--color-primary-text)',
          }"
          :aria-label="`Close-Icon`"
          role="img"
          @click="toggleHamburger"
        />
      </div>
      <!-- Navigation -->
      <div class="p-4">
        <NavBar
          :variant="NavVariant.MOBILE"
          :is-sidebar-collapsed="false"
          :group-title-class="'px-2 text-xs font-semibold uppercase tracking-wide text200-color-difference dark:text-black-200'"
          @item-click="toggleHamburger"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, type Ref, ref } from 'vue';

import NavBar from '@/components/core/sidebar/NavBar.vue';
import { NavVariant } from '@/types/layout';
import { getIconUrl } from '@/utils/assetUrl';

const isDarkMode = inject('isDarkMode') as Ref<boolean>;

const isHamburgerOpen = ref<boolean>(false);

const toggleHamburger = (): void => {
  isHamburgerOpen.value = !isHamburgerOpen.value;
};

// 畫面尺寸監聽
const checkScreenSize = (): void => {
  if (window.innerWidth >= 768) {
    isHamburgerOpen.value = false;
  }
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});
</script>

<style lang="scss" scoped></style>
