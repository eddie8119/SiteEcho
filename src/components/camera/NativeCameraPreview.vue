<template>
  <div
    :id="previewId"
    class="native-camera-preview bg-black relative h-full w-full overflow-hidden"
    @click="handleTapToFocus"
  >
    <!-- Tap-to-Focus Ring -->
    <div
      v-if="focusRingVisible"
      class="focus-ring"
      :class="{ 'focus-ring--focused': !isFocusing }"
      :style="{ left: focusRingX + 'px', top: focusRingY + 'px' }"
    />

    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
      <Loading />
    </div>

    <div
      class="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end"
      :class="
        isMobile
          ? isIPhone
            ? 'pb-[calc(90px+env(safe-area-inset-bottom,0px))]'
            : isAndroid
              ? 'pb-[calc(100px+env(safe-area-inset-bottom,0px))]'
              : 'pb-[calc(80px+env(safe-area-inset-bottom,0px))]'
          : isIPhone
            ? 'pb-[calc(150px+env(safe-area-inset-bottom,0px))]'
            : 'pb-[calc(140px+env(safe-area-inset-bottom,0px))]'
      "
    >
      <div class="pointer-events-auto relative mt-0 flex items-center justify-center">
        <slot name="controls" />

        <!-- Brightness Slider -->
        <div
          v-if="exposureRange.min !== exposureRange.max"
          class="absolute left-[calc(50%+45px)] flex flex-col items-center gap-2"
        >
          <button
            class="bg-black rounded-full bg-opacity-50 p-2 text-white transition-colors hover:bg-opacity-70"
            @click="toggleBrightnessSlider"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </button>
          <div
            v-if="showBrightnessSlider && exposureRange.min !== exposureRange.max"
            class="bg-black absolute bottom-full mb-2 flex h-48 w-12 flex-col items-center justify-center rounded-lg bg-opacity-70 px-2"
          >
            <input
              type="range"
              :min="exposureRange.min"
              :max="exposureRange.max"
              :step="exposureStep"
              :value="exposureValue"
              :disabled="isLoading"
              class="h-48 w-2 -rotate-90 appearance-none rounded-full bg-white bg-opacity-30 outline-none"
              @input="handleExposureChange"
              @change="handleExposureCommit"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { CameraPreviewPlugin } from '@/types/capacitor-camera-preview';
import type { PluginListenerHandle } from '@capacitor/core';

import '@capacitor-community/camera-preview';

const CameraPreview = registerPlugin<CameraPreviewPlugin>('CameraPreview');

import Loading from '@/components/core/loading/Loading.vue';
import { detectDevice } from '@/utils/deviceDetector';

const { t } = useI18n();
const device = detectDevice();
const isMobile = device.isMobile && !device.isTablet;
const isIPhone = device.isIPhone;
const isAndroid = device.isAndroid;

const previewId = 'native-camera-preview';
const isLoading = ref(true);
const error = ref<string | null>(null);
const errorType = ref<string>('permission_denied');
let isStarted = false;
let startInFlight: Promise<void> | null = null;

// Focus ring state
const focusRingVisible = ref(false);
const focusRingX = ref(0);
const focusRingY = ref(0);
const isFocusing = ref(false);
let focusTimer: ReturnType<typeof setTimeout> | null = null;

// Exposure compensation state
const showBrightnessSlider = ref(false);
const exposureValue = ref(0);
const exposureRange = ref({ min: 0, max: 0 });
const exposureStep = ref(0.1);

const buildCameraErrorMessage = (err: unknown) => {
  if (err instanceof Error) {
    if (err.name === 'NotAllowedError') {
      errorType.value = 'permission_denied';
      return t('camera.errors.camera_permission_denied');
    }

    if (err.name === 'NotFoundError') {
      errorType.value = 'no_camera_found';
      return t('camera.errors.no_camera_found');
    }

    if (err.name === 'NotReadableError') {
      errorType.value = 'camera_in_use';
      return t('camera.errors.camera_in_use');
    }

    if (err.name === 'SecurityError') {
      errorType.value = 'security_error';
      return t('camera.errors.security_error');
    }

    errorType.value = 'unknown_error';
    return err.message || t('camera.errors.unknown_error');
  }

  errorType.value = 'unknown_error';
  return t('camera.errors.unknown_error');
};

const startCamera = async () => {
  if (startInFlight) {
    return startInFlight;
  }

  if (isStarted) {
    return;
  }

  isLoading.value = true;
  error.value = null;

  startInFlight = (async () => {
    try {
      await CameraPreview.start({
        parent: previewId,
        position: 'rear',
        toBack: true,
        disableAudio: true,
        enableHighResolution: true,
        enableZoom: true,
        tapFocus: true,
        width: window.innerWidth,
        height: window.innerHeight,
      });
      isStarted = true;
      await loadExposureInfo();
    } catch (err) {
      error.value = buildCameraErrorMessage(err);
    } finally {
      isLoading.value = false;
      startInFlight = null;
    }
  })();

  return startInFlight;
};

const stopCamera = async () => {
  if (!isStarted && !startInFlight) {
    return;
  }

  if (focusTimer) {
    clearTimeout(focusTimer);
    focusTimer = null;
  }
  focusRingVisible.value = false;

  try {
    await CameraPreview.stop();
  } catch {
    // Ignore stop errors when the camera is already closed.
  } finally {
    isStarted = false;
    isLoading.value = false;
    startInFlight = null;
  }
};

const base64ToBlob = async (base64Value: string) => {
  const dataUrl = base64Value.startsWith('data:')
    ? base64Value
    : `data:image/jpeg;base64,${base64Value}`;
  const response = await fetch(dataUrl);
  return response.blob();
};

const handleTapToFocus = async (event: MouseEvent) => {
  if (isLoading.value || error.value || !isStarted) return;

  const target = event.target as HTMLElement;
  if (target.closest('button')) return;

  const container = event.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 排除快門按鈕附近的區域（底部中央）
  const shutterAreaWidth = 180;
  const shutterAreaHeight = 200;
  const centerX = rect.width / 2;
  const bottomY = rect.height;

  // 檢查是否在快門按鈕區域內
  const inShutterArea =
    x >= centerX - shutterAreaWidth / 2 &&
    x <= centerX + shutterAreaWidth / 2 &&
    y >= bottomY - shutterAreaHeight;

  if (inShutterArea) {
    return; // 不觸發對焦
  }

  focusRingX.value = x;
  focusRingY.value = y;
  focusRingVisible.value = true;
  isFocusing.value = true;

  if (focusTimer) {
    clearTimeout(focusTimer);
  }

  // Note: Native camera preview handles focus internally
  // We only show visual feedback

  setTimeout(() => {
    isFocusing.value = false;
  }, 500);

  focusTimer = setTimeout(() => {
    focusRingVisible.value = false;
  }, 3000);
};

// Exposure compensation functions
const toggleBrightnessSlider = () => {
  showBrightnessSlider.value = !showBrightnessSlider.value;
};

const handleExposureChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  exposureValue.value = parseFloat(target.value);
};

const handleExposureCommit = async () => {
  try {
    await CameraPreview.setExposureCompensation({
      value: exposureValue.value,
    });
  } catch {
    // Exposure compensation not supported or failed
  }
};

const loadExposureInfo = async () => {
  try {
    const range = await CameraPreview.getExposureCompensationRange();
    exposureRange.value = range;

    const current = await CameraPreview.getExposureCompensation();
    exposureValue.value = current.value;

    // Calculate step based on range
    const rangeSize = range.max - range.min;
    exposureStep.value = rangeSize / 20; // 20 steps across the range
  } catch {
    // Exposure compensation not supported on this device
    exposureRange.value = { min: 0, max: 0 };
  }
};

const captureFrame = async (): Promise<Blob | null> => {
  if (!isStarted) {
    await startCamera();
  }

  if (!isStarted) {
    return null;
  }

  try {
    const result = await CameraPreview.capture({ quality: 90 });
    const value = result?.value;

    if (!value) {
      return null;
    }

    return await base64ToBlob(value);
  } catch (err) {
    error.value = buildCameraErrorMessage(err);
    return null;
  }
};

let appStateListener: PluginListenerHandle | null = null;

onMounted(() => {
  void startCamera();

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      void startCamera();
    } else {
      void stopCamera();
    }
  }).then((handle) => {
    appStateListener = handle;
  });
});

onActivated(() => {
  void startCamera();
});

onDeactivated(() => {
  void stopCamera();
});

onBeforeUnmount(() => {
  void stopCamera();
  void appStateListener?.remove();
});

defineExpose({
  captureFrame,
});
</script>

<style scoped lang="scss">
.native-camera-preview {
  touch-action: none;
}

.focus-ring {
  position: absolute;
  width: 72px;
  height: 72px;
  border: 2px solid #f97316;
  border-radius: 4px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition:
    width 0.3s ease,
    height 0.3s ease,
    border-color 0.3s ease;
  animation: focusAppear 0.25s ease-out;
  z-index: 20;

  &--focused {
    width: 60px;
    height: 60px;
  }
}

@keyframes focusAppear {
  from {
    width: 100px;
    height: 100px;
    opacity: 0.5;
  }

  to {
    width: 72px;
    height: 72px;
    opacity: 1;
  }
}
</style>
