<template>
  <div class="camera-page flex min-h-[100dvh] flex-col">
    <CameraHeader v-if="!parentPhotoId" v-model:is-pending="isPending" />

    <!-- Follow-up mode header with cancel button -->
    <FollowUpModeHeader
      :parent-photo-id="parentPhotoId"
      :captured-photo-ids="capturedPhotoIds"
      @cancel="handleCancel"
      @done="handleDone"
    />

    <!-- Camera Preview -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <NativeCameraPreview v-if="isNative" ref="cameraPreview">
        <template #controls>
          <ShutterButton :is-capturing="isCapturing" @capture="handleCapture" />
        </template>
      </NativeCameraPreview>

      <CameraPreview v-else ref="cameraPreview" @focus-not-supported="handleFocusNotSupported">
        <template #controls>
          <ShutterButton :is-capturing="isCapturing" @capture="handleCapture" />
        </template>
      </CameraPreview>
    </div>

    <!-- Success Toast -->
    <MobileToast
      v-if="showToast"
      variant="success"
      :title="toastMessage"
      :subtitle="parentPhotoId ? t('camera.take_photo.follow_up_subtitle') : ''"
      :action-text="toastMessage === t('camera.take_photo.recorded') ? '' : ''"
      @close="showToast = false"
    />

    <!-- Focus Not Supported Toast -->
    <MobileToast
      v-if="showFocusNotSupportedToast"
      variant="info"
      :title="t('camera.take_photo.focus_not_supported')"
      subtitle=""
      :duration="8000"
      @close="showFocusNotSupportedToast = false"
    />

    <!-- Dark Photo Warning Toast -->
    <MobileToast
      v-if="showDarkToast"
      variant="info"
      :title="t('camera.take_photo.dark_warning')"
      subtitle=""
      :action-text="t('camera.take_photo.retake')"
      :duration="5000"
      @action="handleConfirmHighQuality"
      @close="showDarkToast = false"
    />

    <!-- Registration Prompt -->
    <RegisterPromptSheet
      v-model="showRegisterPrompt"
      :reason="promptReason"
      :photo-count="photoCount"
      @login="redirectToLogin"
    />

    <!-- Follow-up Upgrade Prompt -->
    <UpgradePromptSheet
      v-model="showUpgradePrompt"
      :title="t('camera.take_photo.upgrade_prompt_title')"
      :description="
        t('camera.take_photo.upgrade_prompt_description', { count: FREE_FOLLOW_UP_LIMIT })
      "
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import RegisterPromptSheet from '@/components/auth/RegisterPromptSheet.vue';
import UpgradePromptSheet from '@/components/billing/UpgradePromptSheet.vue';
import CameraHeader from '@/components/camera/CameraHeader.vue';
import CameraPreview from '@/components/camera/CameraPreview.vue';
import FollowUpModeHeader from '@/components/camera/FollowUpModeHeader.vue';
import NativeCameraPreview from '@/components/camera/NativeCameraPreview.vue';
import ShutterButton from '@/components/camera/ShutterButton.vue';
import MobileToast from '@/components/core/toast/MobileToast.vue';
import { useCameraCapture } from '@/composables/camera/useCameraCapture';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { useFollowUpPhotoFlow } from '@/composables/useFollowUpPhotoFlow';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { FREE_FOLLOW_UP_LIMIT } from '@/config/planConfig';
import { isNativePlatform } from '@/utils/camera';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const isNative = isNativePlatform();

const store = useCurrentProject();
const currentProjectId = computed(() => store.currentProjectId);
const cameraPreview = ref<{ captureFrame: () => Promise<Blob | null> } | null>(null);
const isPending = ref(false);
const parentPhotoId = computed(() => {
  const value = route.query.parentPhotoId;
  return typeof value === 'string' && value.length > 0 ? value : null;
});
const cameraSource = computed(() => {
  const value = route.query.source;
  return typeof value === 'string' && value.length > 0 ? value : null;
});
const capturedPhotoIds = ref<string[]>([]);
const isCapturing = ref(false);

onMounted(async () => {
  await store.initializeCurrentProject();
  updatePhotoCount();
});

const { restoreFollowUpDraft, finalizeLayer3Photos } = useFollowUpPhotoFlow();

const {
  showRegisterPrompt,
  showUpgradePrompt,
  promptReason,
  photoCount,
  checkPhotoCountTrigger,
  redirectToLogin,
  updatePhotoCount,
} = useRegistrationFlow();

const showFocusNotSupportedToast = ref(false);

const { showToast, toastMessage, showDarkToast, processCapturedPhoto, lastPhotoId } =
  useCameraCapture({
    currentProjectId: currentProjectId,
    isPending: isPending,
    parentPhotoId: parentPhotoId,
    t: t,
    onPhotoSaved: async () => {
      await updatePhotoCount();
      await checkPhotoCountTrigger();
      // Track captured photo IDs in this session
      if (lastPhotoId.value && parentPhotoId.value) {
        capturedPhotoIds.value.push(lastPhotoId.value);
      }
    },
  });

const handleFocusNotSupported = () => {
  if (sessionStorage.getItem('focusNotSupportedShown')) return;
  sessionStorage.setItem('focusNotSupportedShown', '1');
  showFocusNotSupportedToast.value = true;
};

const handleConfirmHighQuality = () => {
  showDarkToast.value = false;
};

// Time and date display is now handled by CameraHeader/useCameraDateTime

const handleCapture = async () => {
  if (!cameraPreview.value || isCapturing.value) {
    return;
  }

  isCapturing.value = true;

  try {
    const blob = await cameraPreview.value.captureFrame();

    if (!blob) {
      console.error('Failed to capture frame');
      return;
    }

    await processCapturedPhoto(blob, !isNative); // Web camera skips EXIF handling
  } catch (error) {
    console.error('Failed to capture photo:', error);
  } finally {
    isCapturing.value = false;
  }
};

const handleCancel = async () => {
  // Undo the resolved status of the parent photo
  if (parentPhotoId.value) {
    try {
      await restoreFollowUpDraft(parentPhotoId.value, capturedPhotoIds.value, {
        restoreParent: cameraSource.value !== 'photo-edit',
      });
    } catch (error) {
      console.error('Failed to restore follow-up draft:', error);
    }
  }

  if (cameraSource.value === 'photo-edit' && parentPhotoId.value) {
    router.push({ name: 'photo-edit', params: { id: parentPhotoId.value } });
    return;
  }

  router.push({
    name: 'pending',
    query: parentPhotoId.value ? { openBottomSheet: parentPhotoId.value } : {},
  });
};

const handleDone = async () => {
  if (parentPhotoId.value) {
    try {
      const success = await finalizeLayer3Photos(
        [parentPhotoId.value, ...capturedPhotoIds.value],
        parentPhotoId.value
      );
      if (!success) {
        console.warn('Failed to finalize follow-up photos to layer 3');
      }
    } catch (error) {
      console.error('Failed to finalize follow-up photos:', error);
    }
  }

  if (cameraSource.value === 'photo-edit' && parentPhotoId.value) {
    router.push({ name: 'photo-edit', params: { id: parentPhotoId.value } });
    return;
  }

  router.push({ name: 'pending' });
};

// const handleEditPhoto = () => {
//   if (lastPhotoId.value) {
//     router.push({
//       name: 'photo-edit',
//       params: {
//         id: lastPhotoId.value,
//       },
//     });
//   }
// };
</script>

<style scoped lang="scss">
.camera-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
