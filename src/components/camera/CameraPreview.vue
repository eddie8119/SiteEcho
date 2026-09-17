<template>
  <div class="bg-black relative h-full w-full overflow-hidden" @click="handleTapToFocus">
    <video ref="videoElement" class="h-full w-full object-cover" autoplay playsinline muted />

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

    <!-- Error State Dialog -->
    <BasicEditDialog
      v-model="showErrorDialog"
      :title="t('camera.errors.cannot_access_camera')"
      :error-message="error || undefined"
      :show-footer-button="false"
      width="90vw"
      @cancel="error = null"
    >
      <CameraPermissionGuide
        :error-type="errorType"
        @retry="initializeCamera"
        @close="error = null"
      />
    </BasicEditDialog>

    <!-- Camera Controls Overlay -->
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
      <!-- Bottom Controls -->
      <div class="pointer-events-auto relative mt-0 flex items-center justify-center">
        <!-- Shutter Button (Centered) -->
        <slot name="controls" />
        <!-- Flash Button  -->
        <button
          class="absolute ml-[120px] rounded-full p-2 text-white transition-colors"
          :class="
            flashEnabled
              ? 'bg-yellow-500 bg-opacity-70'
              : 'bg-black bg-opacity-50 hover:bg-opacity-70'
          "
          @click="toggleFlash"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CameraPermissionGuide from './CameraPermissionGuide.vue';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import Loading from '@/components/core/loading/Loading.vue';
import { detectDevice } from '@/utils/deviceDetector';

defineEmits<{
  (e: 'focus-not-supported'): void;
}>();

const { t } = useI18n();
const device = detectDevice();
const isMobile = device.isMobile && !device.isTablet;
const isIPhone = device.isIPhone;
const isAndroid = device.isAndroid;

console.log('CameraPreview Device detection:', {
  isMobile,
  isIPhone,
  isTablet: device.isTablet,
  userAgent: device.userAgent,
});

const videoElement = ref<HTMLVideoElement | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const errorType = ref<string>('permission_denied');
const flashEnabled = ref(false);
let stream: MediaStream | null = null;

const showErrorDialog = computed({
  get: () => error.value !== null,
  set: (value: boolean) => {
    if (!value) error.value = null;
  },
});

const focusRingVisible = ref(false);
const focusRingX = ref(0);
const focusRingY = ref(0);
const isFocusing = ref(false);
let focusTimer: ReturnType<typeof setTimeout> | null = null;

// Store device orientation data
const deviceOrientation = ref({ alpha: 0, beta: 0, gamma: 0 });

const initializeCamera = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      errorType.value = 'browser_not_supported';
      throw new Error(t('camera.errors.browser_not_supported'));
    }

    // Check for secure context (HTTPS or localhost)
    if (!window.isSecureContext && !window.location.hostname.includes('localhost')) {
      throw new Error(t('camera.errors.requires_https'));
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (videoElement.value) {
      videoElement.value.srcObject = stream;
      videoElement.value.onloadedmetadata = () => {
        isLoading.value = false;
      };
    }

    // Try to enable continuous autofocus after stream is ready
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
        });
      }
    } catch {
      // Continuous autofocus not supported on this device/browser
    }
  } catch (err) {
    let errorMessage = t('camera.errors.unknown_error');

    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        errorMessage = t('camera.errors.camera_permission_denied');
        errorType.value = 'permission_denied';
      } else if (err.name === 'NotFoundError') {
        errorMessage = t('camera.errors.no_camera_found');
        errorType.value = 'no_camera_found';
      } else if (err.name === 'NotReadableError') {
        errorMessage = t('camera.errors.camera_in_use');
        errorType.value = 'camera_in_use';
      } else if (err.name === 'SecurityError') {
        errorMessage = t('camera.errors.security_error');
        errorType.value = 'security_error';
      } else {
        errorMessage = err.message;
        errorType.value = 'unknown_error';
      }
    }

    error.value = errorMessage;
    isLoading.value = false;
  }
};

const stopCamera = () => {
  if (focusTimer) {
    clearTimeout(focusTimer);
    focusTimer = null;
  }
  focusRingVisible.value = false;

  // Turn off flash before stopping camera
  if (flashEnabled.value && stream) {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack
        .applyConstraints({
          advanced: [{ torch: false }] as unknown as MediaTrackConstraintSet[],
        })
        .catch(() => {
          // Ignore errors when turning off flash
        });
    }
  }

  if (stream) {
    stream.getTracks().forEach((track) => {
      (track as MediaStreamTrack).stop();
    });
    stream = null;
  }

  flashEnabled.value = false;
};

const toggleFlash = async () => {
  if (!stream) return;

  try {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Type cast to access torch capability
    const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & {
      torch?: boolean;
    };

    if (!capabilities.torch) {
      // Flash not supported, show error or just toggle state
      flashEnabled.value = !flashEnabled.value;
      return;
    }

    // Toggle torch mode
    flashEnabled.value = !flashEnabled.value;
    await videoTrack.applyConstraints({
      advanced: [{ torch: flashEnabled.value }] as unknown as MediaTrackConstraintSet[],
    });
  } catch (error) {
    console.warn('Flash toggle failed:', error);
    // Still toggle the state for UI feedback
    flashEnabled.value = !flashEnabled.value;
  }
};

const captureFrame = (): Promise<Blob | null> => {
  if (!videoElement.value) {
    return Promise.resolve(null);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.resolve(null);
  }

  const videoWidth = videoElement.value.videoWidth;
  const videoHeight = videoElement.value.videoHeight;

  // Use device orientation gamma value to determine rotation
  // gamma: left-to-right tilt in degrees (-90 to 90)
  // Positive gamma = tilted right (right side down)
  // Negative gamma = tilted left (left side down)
  const gamma = deviceOrientation.value.gamma;

  // Mobile rear cameras have portrait-oriented sensors
  // The video element is rotated by CSS to match device orientation
  // We need to rotate the canvas to match what the user sees
  let targetWidth = videoWidth;
  let targetHeight = videoHeight;
  let rotation = 0;

  // Determine rotation based on gamma value
  if (gamma > 45) {
    // Tilted to the right (right side down) - landscape
    // Rotate -90° to make output landscape
    targetWidth = videoHeight;
    targetHeight = videoWidth;
    rotation = -90;
  } else if (gamma < -45) {
    // Tilted to the left (left side down) - landscape
    // Rotate 90° to make output landscape
    targetWidth = videoHeight;
    targetHeight = videoWidth;
    rotation = 90;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.save();

  if (rotation === 90) {
    ctx.translate(targetWidth, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (rotation === -90) {
    ctx.translate(0, targetHeight);
    ctx.rotate((-90 * Math.PI) / 180);
  } else if (rotation === 180) {
    ctx.translate(targetWidth, targetHeight);
    ctx.rotate(Math.PI);
  }

  ctx.drawImage(videoElement.value, 0, 0, videoWidth, videoHeight);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      'image/jpeg',
      0.9
    );
  });
};

onMounted(() => {
  initializeCamera();

  // Listen to device orientation
  if (window.DeviceOrientationEvent) {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      deviceOrientation.value = {
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0,
      };
    };
    window.addEventListener('deviceorientation', handleOrientation);
  }
});

onActivated(() => {
  initializeCamera();
});

onDeactivated(() => {
  stopCamera();
});

onUnmounted(() => {
  stopCamera();
});

const handleTapToFocus = async (event: MouseEvent) => {
  if (isLoading.value || error.value || !stream) return;

  const target = event.target as HTMLElement;
  if (target.closest('button')) return;

  const container = event.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 排除快門按鈕附近的區域（底部中央）
  // 快門按鈕實際大小為 h-14 w-14 (56px)，擴大排除區域以確保不會誤觸發對焦
  const shutterAreaWidth = 180;
  const shutterAreaHeight = 200;
  const centerX = rect.width / 2;
  const bottomY = rect.height;

  // 檢查是否在快門按鈕區域內（擴大範圍以確保不會誤觸發）
  const inShutterArea =
    x >= centerX - shutterAreaWidth / 2 &&
    x <= centerX + shutterAreaWidth / 2 &&
    y >= bottomY - shutterAreaHeight;

  if (inShutterArea) {
    return; // 不觸發對焦
  }

  const normalizedX = Math.max(0, Math.min(1, x / rect.width));
  const normalizedY = Math.max(0, Math.min(1, y / rect.height));

  focusRingX.value = x;
  focusRingY.value = y;
  focusRingVisible.value = true;
  isFocusing.value = true;

  if (focusTimer) {
    clearTimeout(focusTimer);
  }

  try {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      await videoTrack.applyConstraints({
        advanced: [
          {
            focusMode: 'manual',
            pointOfInterest: { x: normalizedX, y: normalizedY },
          } as unknown as MediaTrackConstraintSet,
        ],
      });
    }
  } catch {
    // Tap-to-focus API not supported on this device, UI feedback still shown
  }

  setTimeout(() => {
    isFocusing.value = false;
  }, 500);

  focusTimer = setTimeout(async () => {
    focusRingVisible.value = false;
    try {
      const videoTrack = stream?.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
        });
      }
    } catch {
      // ignore
    }
  }, 3000);
};

defineExpose({
  captureFrame,
  isLoading,
  error,
});
</script>

<style scoped lang="scss">
.camera-preview {
  video {
    display: block;
  }
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
