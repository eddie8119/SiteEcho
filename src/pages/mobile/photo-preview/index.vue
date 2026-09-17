<template>
  <div class="flex h-screen flex-col bg-white">
    <MobileHeader title="確認拍攝" />
    <!-- Note: This page is deprecated in the new flow but kept for compatibility -->

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 py-4 pb-20">
      <PhotoEditForm
        ref="formRef"
        :photo="photo"
        :show-space-selection="true"
        mode="create"
        :on-discard="handleDiscard"
        :on-confirm="handleFinalConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { LocalPhoto } from '@/types/photo';

import { deletePhotoByClientId } from '@/api/photo';
import MobileHeader from '@/components/core/header/MobileHeader.vue';
import PhotoEditForm from '@/components/photo/PhotoEditForm.vue';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { EvidenceAction } from '@/composables/useTimelineMultiSelect';
import { getPhotoFromIndexedDB, updatePhotoInIndexedDB } from '@/utils/indexedDB';

const router = useRouter();
const route = useRoute();
const { updatePhotoCount } = useRegistrationFlow();

const formRef = ref<InstanceType<typeof PhotoEditForm> | null>(null);
const photo = ref<LocalPhoto | null>(null);
const isLoading = ref(true);

const handleDiscard = async (evidenceAction?: EvidenceAction) => {
  if (!photo.value) {
    return;
  }

  const photoId = photo.value.id;
  const isEvidence = photo.value.isEvidence;
  const isSynced = photo.value.synced;

  try {
    // For evidence photos (Layer 2-3), handle based on evidenceAction
    if (isEvidence && evidenceAction === EvidenceAction.Trash) {
      // Soft delete with trashedAt for 30-day recovery
      await updatePhotoInIndexedDB(photoId, { isDeleted: true, trashedAt: new Date() });
    } else {
      // Permanent delete or regular photo
      await updatePhotoInIndexedDB(photoId, { isDeleted: true });

      // For synced evidence photos, permanently delete from cloud
      if (isEvidence && isSynced) {
        const success = await deletePhotoByClientId(photoId);
        if (!success) {
          console.error(`[PhotoPreview] Failed to delete photo ${photoId} from cloud`);
        }
      }
    }

    // Update photo count
    await updatePhotoCount();

    // Return to camera page instead of timeline
    router.push('/mobile/take-photo');
  } catch (error) {
    console.error(`[PhotoPreview] Failed to delete photo ${photoId}:`, error);
  }
};

const handleFinalConfirm = async () => {
  if (!photo.value || !formRef.value) {
    return;
  }

  const photoId = photo.value.id;

  try {
    const formData = formRef.value.getFormData();
    // Update photo metadata in IndexedDB
    await updatePhotoInIndexedDB(photoId, {
      constructions: formData.constructions,
      space: formData.space,
      status: formData.status,
      pendingType: formData.pendingType,
      note: formData.note,
    });

    // Return to timeline after successful save
    router.push('/mobile/timeline');
  } catch (error) {
    console.error(`[PhotoPreview] Failed to update photo ${photoId}:`, error);
  }
};

/**
 * Load photo from IndexedDB by ID
 * If photo not found or error occurs, navigate back
 */
onMounted(async () => {
  const photoId = route.params.id as string;
  if (!photoId) {
    router.back();
    return;
  }

  try {
    const loadedPhoto = await getPhotoFromIndexedDB(photoId);
    if (loadedPhoto) {
      photo.value = loadedPhoto;
    } else {
      router.back();
    }
  } catch (error) {
    console.error(`[PhotoPreview] Failed to load photo ${photoId}:`, error);
    router.back();
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped lang="scss">
textarea {
  resize: vertical;
}
</style>
