<template>
  <div
    class="app-background"
    :class="{
      'camera-mode': isNativeCameraMode,
      'browser-camera-mode': isBrowserCameraMode,
      'landing-page': isLandingPage,
    }"
  >
    <RouterView />
    <Toast
      v-if="globalToastMessage"
      :key="globalToastKey"
      :message="globalToastMessage"
      :variant="globalToastVariant"
      :duration="globalToastDuration"
      @close="globalToastMessage = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import Toast from '@/components/core/Toast.vue';
import { useGlobalUI } from '@/composables/ui/useGlobalUI';
import { LOGIN_REQUIRED_TOAST_EVENT, type LoginRequiredToastDetail } from '@/utils/authPrompt';
import {
  isBrowserCameraPage as checkBrowserCameraPage,
  isNativeCameraPage as checkNativeCameraPage,
} from '@/utils/camera';

// Global UI logic
const { isDarkMode, setTheme } = useGlobalUI();
const { t } = useI18n();
const route = useRoute();

provide('toggleTheme', () => {
  isDarkMode.value = !isDarkMode.value;
  setTheme(isDarkMode.value);
});

// Provide theme to child components
provide('isDarkMode', isDarkMode);

const globalToastMessage = ref<string | null>(null);
const globalToastVariant = ref<'success' | 'error' | 'info'>('info');
const globalToastDuration = ref(1800);
const globalToastKey = ref(0);

const isNativeCameraMode = computed(() => checkNativeCameraPage(route));
const isBrowserCameraMode = computed(() => checkBrowserCameraPage(route));
const isLandingPage = computed(
  () => route.path === '/' || route.path === '/more-apps' || route.path === '/pricing-menu'
);

const syncCameraPageBackgroundClass = () => {
  document.body.classList.toggle('native-camera-page', isNativeCameraMode.value);
  document.documentElement.classList.toggle('native-camera-page', isNativeCameraMode.value);
  document.body.classList.toggle('browser-camera-page', isBrowserCameraMode.value);
  document.documentElement.classList.toggle('browser-camera-page', isBrowserCameraMode.value);
};

watch([isNativeCameraMode, isBrowserCameraMode], syncCameraPageBackgroundClass, {
  immediate: true,
});

const handleGlobalToastEvent = (event: Event) => {
  const customEvent = event as CustomEvent<LoginRequiredToastDetail>;
  const messageKey = customEvent.detail?.messageKey;
  if (!messageKey) {
    return;
  }

  globalToastMessage.value = t(messageKey);
  globalToastVariant.value = customEvent.detail.variant ?? 'info';
  globalToastDuration.value = customEvent.detail.durationMs ?? 1800;
  globalToastKey.value += 1;
};

const resetIOSViewportOffset = () => {
  // WKWebView / Safari may leave the layout viewport scrolled after the
  // software keyboard changes the visual viewport. The app shell itself
  // must always stay at the top; only <main> is allowed to scroll.
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

const handleViewportChange = () => {
  requestAnimationFrame(resetIOSViewportOffset);
};

const handleFocusOut = () => {
  // Keyboard closing is asynchronous on iOS. Reset immediately and again
  // after the viewport has finished returning to its original size.
  nextTick(() => {
    resetIOSViewportOffset();
    window.setTimeout(resetIOSViewportOffset, 50);
    window.setTimeout(resetIOSViewportOffset, 250);
  });
};

onMounted(() => {
  window.addEventListener(LOGIN_REQUIRED_TOAST_EVENT, handleGlobalToastEvent);
  window.addEventListener('scroll', handleViewportChange, { passive: true });
  window.visualViewport?.addEventListener('scroll', handleViewportChange, { passive: true });
  window.visualViewport?.addEventListener('resize', handleViewportChange, { passive: true });
  document.addEventListener('focusout', handleFocusOut);
  resetIOSViewportOffset();
});

onBeforeUnmount(() => {
  window.removeEventListener(LOGIN_REQUIRED_TOAST_EVENT, handleGlobalToastEvent);
  window.removeEventListener('scroll', handleViewportChange);
  window.visualViewport?.removeEventListener('scroll', handleViewportChange);
  window.visualViewport?.removeEventListener('resize', handleViewportChange);
  document.removeEventListener('focusout', handleFocusOut);
  document.body.classList.remove('native-camera-page', 'browser-camera-page');
  document.documentElement.classList.remove('native-camera-page', 'browser-camera-page');
});
</script>

<style scoped>
.app-background {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--color-primary-panel);
  overflow: hidden;
  overscroll-behavior: none;
}

.dark .app-background {
  background: var(--color-dark-primary-panel);
}

.app-background.camera-mode {
  background: transparent !important;
}

.app-background.browser-camera-mode {
  background: #000 !important;
}

.app-background.landing-page {
  overflow: auto !important;
  overscroll-behavior: auto !important;
}

/* Global body/html overrides for camera pages */
:global(body.native-camera-page),
:global(html.native-camera-page) {
  background: transparent !important;
}

:global(body.browser-camera-page),
:global(html.browser-camera-page) {
  background: #000 !important;
}
</style>
