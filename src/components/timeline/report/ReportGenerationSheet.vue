<template>
  <!-- 背景遮罩 -->
  <div
    v-show="modelValue"
    class="bg-black/60 fixed inset-0 z-[60] backdrop-blur-sm transition-opacity duration-300"
    @click="emit('update:modelValue', false)"
  />

  <Teleport to="body">
    <Transition name="sheet-slide">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[70] flex flex-col justify-end"
        @click.self="emit('update:modelValue', false)"
      >
        <!-- Sheet -->
        <div
          class="relative z-10 flex max-h-[90vh] flex-col rounded-t-2xl bg-white px-4 pb-8 pt-4 shadow-xl"
          v-bind="$attrs"
        >
          <!-- Handle -->
          <div class="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-gray-300" />

          <div class="mb-4 flex items-center justify-between">
            <H2Title :title="$t('report.generationSheet.title')" />
            <DeleteButton @click="emit('update:modelValue', false)" />
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto">
            <!-- Step 1: Preview -->
            <FollowUpReportPreview
              v-if="purpose === Purpose.FollowUp"
              :follow-up-groups="followUpGroups"
              :group-notes="groupReportNotes"
              :photo-thumbnail-urls="photoThumbnailUrls"
              :editing-group="editingPhoto"
              @update:group-note="(parentId, value) => (groupReportNotes[parentId] = value)"
              @done-editing="editingPhoto = null"
            />
            <ReportPreviewSection
              v-else
              :grouped-photos="groupedPhotos"
              :group-report-notes="groupReportNotes"
              :photo-report-notes="photoReportNotes"
              :photo-thumbnail-urls="photoThumbnailUrls"
              :billing-amounts="billingAmounts"
              :purpose="purpose"
              :editing-photo="editingPhoto"
              @update:group-note="(space, value) => (groupReportNotes[space] = value)"
              @edit-photo="editingPhoto = $event"
              @update:photo-note="(photoId, value) => (photoReportNotes[photoId] = value)"
              @done-editing="editingPhoto = null"
              @update:billing="billingAmounts = $event"
            />

            <!-- Step 2: Purpose -->
            <div v-if="!fixedPurpose" class="mb-6">
              <H3Title :title="$t('report.generationSheet.purpose')" class-name=" text-gray-500" />
              <ReportPurposeSelector
                :model-value="purpose"
                @update:model-value="purpose = $event"
              />
            </div>

            <!-- Step 3: Format -->
            <ReportFormatSelector v-model="exportFormat" />
          </div>

          <!-- Footer -->
          <ReportFooter
            :purpose="purpose"
            :export-format="exportFormat"
            :grand-total="grandTotal"
            :is-billing-complete="isBillingComplete"
            :copy-success="copySuccess"
            @copy-billing="handleCopyBilling"
            @download="handleDownload"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, toRaw, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import FollowUpReportPreview from './FollowUpReportPreview.vue';
import ReportFooter from './ReportFooter.vue';
import ReportFormatSelector from './ReportFormatSelector.vue';
import ReportPreviewSection from './ReportPreviewSection.vue';
import ReportPurposeSelector from './ReportPurposeSelector.vue';
import { getConstructionsForSpace } from './utils';

import type { LocalPhoto, Project } from '@/types/photo';
import type { GroupedPhotos } from '@/types/report';

import H2Title from '@/components/core/title/H2Title.vue';
import H3Title from '@/components/core/title/H3Title.vue';
import DeleteButton from '@/components/ui/DeleteButton.vue';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { usePriceMemory } from '@/composables/usePriceMemory';
import { PendingType } from '@/types/photo';
import { Purpose } from '@/types/report';
import { saveProjectToIndexedDB, updateProjectInIndexedDB } from '@/utils/indexedDB';

const props = defineProps<{
  modelValue: boolean;
  selectedPhotos: LocalPhoto[];
  initialPurpose?: Purpose | null;
  fixedPurpose?: Purpose | null;
  initialBilling?: Record<string, number> | null;
  initialGroupNotes?: Record<string, string>;
  allPhotos?: LocalPhoto[]; // All photos available in the current context (for auto-loading follow-up photos)
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'download-pdf': [
    data: {
      purpose: Purpose | null;
      groups: GroupedPhotos;
      billing: Record<string, number> | null;
      groupNotes: Record<string, string>;
      photoNotes: Record<string, string>;
      followUpGroups?: Array<{
        parentId: string;
        parentPhoto: LocalPhoto;
        followUpPhotos: LocalPhoto[];
        space: string;
        note: string;
        constructions: string[];
        pendingType?: PendingType;
        resolvedAt: Date;
      }>;
    },
  ];
  'download-word': [
    data: {
      purpose: Purpose | null;
      groups: GroupedPhotos;
      billing: Record<string, number> | null;
      groupNotes: Record<string, string>;
      photoNotes: Record<string, string>;
      followUpGroups?: Array<{
        parentId: string;
        parentPhoto: LocalPhoto;
        followUpPhotos: LocalPhoto[];
        space: string;
        note: string;
        constructions: string[];
        pendingType?: PendingType;
        resolvedAt: Date;
      }>;
    },
  ];
}>();

defineOptions({
  inheritAttrs: false,
});

const purpose = ref<Purpose | null>(null);
const exportFormat = ref<'pdf' | 'word'>('pdf');

// Initialize purpose: use fixedPurpose if provided, otherwise use initialPurpose
watch(
  () => props.fixedPurpose,
  (newFixedPurpose) => {
    if (newFixedPurpose) {
      purpose.value = newFixedPurpose;
    }
  },
  { immediate: true }
);

watch(
  () => props.initialPurpose,
  (newInitialPurpose) => {
    // Only set purpose from initialPurpose if fixedPurpose is not provided
    if (!props.fixedPurpose && newInitialPurpose) {
      purpose.value = newInitialPurpose;
    }
  },
  { immediate: true }
);
const billingAmounts = ref<Record<string, number | undefined>>({});
const groupReportNotes = ref<Record<string, string>>({});
const photoReportNotes = ref<Record<string, string>>({});
const editingPhoto = ref<string | null>(null);
const copySuccess = ref(false);

const { getPrice } = usePriceMemory();
const { t } = useI18n();

// Type guard to check if a photo is a PhotoRecord (has imageUrl)
function isPhotoRecord(
  photo: LocalPhoto
): photo is LocalPhoto & { imageUrl: string; thumbnailUrl?: string } {
  return (
    'imageUrl' in photo &&
    typeof (photo as LocalPhoto & { imageUrl?: string }).imageUrl === 'string'
  );
}

// Get current project from store
const store = useCurrentProject();
const { currentProjectName } = storeToRefs(store);

const currentProjectId = computed(() => {
  if (props.selectedPhotos.length > 0) {
    return props.selectedPhotos[0].projectId;
  }
  return null;
});

const groupedPhotos = computed(() => {
  const groups: GroupedPhotos = {};

  props.selectedPhotos.forEach((photo) => {
    const space = photo.space || '';
    const constructions =
      photo.constructions && photo.constructions.length > 0 ? photo.constructions : [''];

    if (!groups[space]) {
      groups[space] = {};
    }

    // 同一張照片只保留一次，但收集所有工種
    if (!groups[space][photo.id]) {
      groups[space][photo.id] = {
        photo,
        constructions: [],
      };
    }

    // 將此照片的所有工種加入清單（避免重複）
    constructions.forEach((construction) => {
      if (!groups[space][photo.id].constructions.includes(construction)) {
        groups[space][photo.id].constructions.push(construction);
      }
    });
  });

  return groups;
});

// 計算 follow-up 分組數據
const followUpGroups = computed(() => {
  const groups: Array<{
    parentId: string;
    parentPhoto: LocalPhoto;
    followUpPhotos: LocalPhoto[];
    space: string;
    note: string;
    constructions: string[];
    pendingType?: PendingType;
    resolvedAt: Date;
  }> = [];

  // 找出所有有 follow-up 關聯的照片（父照片）
  // 移除 status === 'resolved' 條件，因為在 photo-edit 頁面中我們已經知道這是父照片
  const parentPhotos = props.selectedPhotos.filter(
    (photo) => photo.relatedPhotoIds && photo.relatedPhotoIds.length > 0
  );

  parentPhotos.forEach((parentPhoto) => {
    // 從所有選擇的照片中找出相關的 follow-up 照片
    let followUpPhotos = props.selectedPhotos.filter((photo) =>
      parentPhoto.relatedPhotoIds?.includes(photo.id)
    );

    // 如果選擇的照片中沒有 follow-up 照片，但提供了 allPhotos，則從 allPhotos 中加載
    if (followUpPhotos.length === 0 && props.allPhotos && props.allPhotos.length > 0) {
      followUpPhotos = props.allPhotos.filter((photo) =>
        parentPhoto.relatedPhotoIds?.includes(photo.id)
      );
    }

    // 即使沒有 follow-up 照片，也顯示父照片（單獨的問題紀錄）
    groups.push({
      parentId: parentPhoto.id,
      parentPhoto,
      followUpPhotos,
      space: parentPhoto.space || '',
      note: parentPhoto.note || '',
      constructions: parentPhoto.constructions || [],
      pendingType: parentPhoto.pendingType ?? undefined,
      resolvedAt: parentPhoto.resolvedAt || new Date(),
    });
  });

  return groups;
});

const grandTotal = computed(() => {
  if (purpose.value !== Purpose.Billing) return 0;
  return Object.values(billingAmounts.value).reduce<number>((sum, val) => sum + (val ?? 0), 0);
});

const isBillingComplete = computed(() => {
  if (purpose.value !== Purpose.Billing) return true;

  // Check if all displayed categories have an amount
  return Object.keys(groupedPhotos.value).every((space) => {
    const constructions = getConstructionsForSpace(groupedPhotos.value[space]);
    return constructions.every((construction: string) => {
      const amount = billingAmounts.value[`${space}-${construction}`];
      return amount !== undefined && amount !== null && amount >= 0;
    });
  });
});

const photoThumbnailUrls = ref<Record<string, string>>({});

// Debounced auto-save function to prevent excessive IndexedDB writes
const debouncedSaveToIndexedDB = useDebounceFn(async (notesToSave: Record<string, string>) => {
  if (!currentProjectId.value) return;

  try {
    await updateProjectInIndexedDB(currentProjectId.value, {
      groupReportNotes: notesToSave,
    });
  } catch (error) {
    // If project doesn't exist in IndexedDB, create it (likely first time)
    if (error instanceof Error && error.message?.includes('not found')) {
      try {
        const projectToSave: Project = {
          id: currentProjectId.value,
          name: currentProjectName.value || t('sheet.reportGeneration.projectFallback'),
          createdAt: new Date(),
          lastUsedAt: new Date(),
          updatedAt: new Date(),
          groupReportNotes: notesToSave,
        };
        await saveProjectToIndexedDB(projectToSave);
      } catch (createError) {
        console.warn('Failed to create project record:', createError);
      }
    } else {
      console.warn('Failed to auto-save group notes:', error);
    }
  }
}, 1000); // 1 second debounce

// Auto-save group notes to IndexedDB whenever they change
watch(
  groupReportNotes,
  (newNotes) => {
    // Only save if the sheet is open and we have a project ID
    if (!currentProjectId.value || !props.modelValue) return;

    const notesToSave = toRaw(newNotes);
    debouncedSaveToIndexedDB(notesToSave);
  },
  { deep: true }
);

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      purpose.value = null;
      exportFormat.value = 'pdf';
      billingAmounts.value = {};
      photoReportNotes.value = {};
      editingPhoto.value = null;
      copySuccess.value = false;
      // Revoke all thumbnail URLs
      Object.values(photoThumbnailUrls.value).forEach((url) => URL.revokeObjectURL(url));
      photoThumbnailUrls.value = {};
    } else {
      // Initialize group notes from initial notes
      groupReportNotes.value = props.initialGroupNotes ? { ...props.initialGroupNotes } : {};

      // Restore purpose
      if (props.initialPurpose) {
        purpose.value = props.initialPurpose;
      }

      // Initialize billing from saved data, then fill gaps from price memory
      const billing: Record<string, number | undefined> = props.initialBilling
        ? { ...props.initialBilling }
        : {};
      Object.keys(groupedPhotos.value).forEach((space) => {
        const constructions = getConstructionsForSpace(groupedPhotos.value[space]);
        constructions.forEach((construction: string) => {
          const key = `${space}-${construction}`;
          if (billing[key] === undefined) {
            const memPrice = getPrice(construction);
            if (memPrice !== undefined) {
              billing[key] = memPrice;
            }
          }
        });
      });
      billingAmounts.value = billing;

      // Initialize photo notes and thumbnails
      props.selectedPhotos.forEach((photo) => {
        if (photo.reportNote) {
          photoReportNotes.value[photo.id] = photo.reportNote;
        }

        if (!photoThumbnailUrls.value[photo.id]) {
          // Try to use local file first
          if (photo.file && photo.file.size > 0) {
            photoThumbnailUrls.value[photo.id] = URL.createObjectURL(photo.file);
          }
          // Fallback to imageUrl or thumbnailUrl if available
          else if (isPhotoRecord(photo) && photo.imageUrl) {
            photoThumbnailUrls.value[photo.id] = photo.imageUrl;
          } else if (isPhotoRecord(photo) && photo.thumbnailUrl) {
            photoThumbnailUrls.value[photo.id] = photo.thumbnailUrl;
          }
        }
      });

      // Also initialize thumbnails for follow-up photos from allPhotos
      if (props.allPhotos && props.allPhotos.length > 0) {
        props.allPhotos.forEach((photo) => {
          if (!photoThumbnailUrls.value[photo.id]) {
            // Try to use local file first
            if (photo.file && photo.file.size > 0) {
              photoThumbnailUrls.value[photo.id] = URL.createObjectURL(photo.file);
            }
            // Fallback to imageUrl or thumbnailUrl if available
            else if (isPhotoRecord(photo) && photo.imageUrl) {
              photoThumbnailUrls.value[photo.id] = photo.imageUrl;
            } else if (isPhotoRecord(photo) && photo.thumbnailUrl) {
              photoThumbnailUrls.value[photo.id] = photo.thumbnailUrl;
            }
          }
        });
      }
    }
  }
);

// Initialize photo thumbnails on mount (for v-if usage)
onMounted(() => {
  if (props.modelValue) {
    // Initialize photo notes and thumbnails
    props.selectedPhotos.forEach((photo) => {
      if (photo.reportNote) {
        photoReportNotes.value[photo.id] = photo.reportNote;
      }

      if (!photoThumbnailUrls.value[photo.id]) {
        // Try to use local file first
        if (photo.file && photo.file.size > 0) {
          photoThumbnailUrls.value[photo.id] = URL.createObjectURL(photo.file);
        }
        // Fallback to imageUrl or thumbnailUrl if available
        else if (isPhotoRecord(photo) && photo.imageUrl) {
          photoThumbnailUrls.value[photo.id] = photo.imageUrl;
        } else if (isPhotoRecord(photo) && photo.thumbnailUrl) {
          photoThumbnailUrls.value[photo.id] = photo.thumbnailUrl;
        }
      }
    });

    // Also initialize thumbnails for follow-up photos from allPhotos
    if (props.allPhotos && props.allPhotos.length > 0) {
      props.allPhotos.forEach((photo) => {
        if (!photoThumbnailUrls.value[photo.id]) {
          // Try to use local file first
          if (photo.file && photo.file.size > 0) {
            photoThumbnailUrls.value[photo.id] = URL.createObjectURL(photo.file);
          }
          // Fallback to imageUrl or thumbnailUrl if available
          else if (isPhotoRecord(photo) && photo.imageUrl) {
            photoThumbnailUrls.value[photo.id] = photo.imageUrl;
          } else if (isPhotoRecord(photo) && photo.thumbnailUrl) {
            photoThumbnailUrls.value[photo.id] = photo.thumbnailUrl;
          }
        }
      });
    }
  }
});

// Watch allPhotos changes to initialize thumbnails for follow-up photos
watch(
  () => props.allPhotos,
  (newAllPhotos) => {
    if (newAllPhotos && newAllPhotos.length > 0 && props.modelValue) {
      newAllPhotos.forEach((photo) => {
        if (!photoThumbnailUrls.value[photo.id]) {
          // Try to use local file first
          if (photo.file && photo.file.size > 0) {
            photoThumbnailUrls.value[photo.id] = URL.createObjectURL(photo.file);
          }
          // Fallback to imageUrl or thumbnailUrl if available
          else if (isPhotoRecord(photo) && photo.imageUrl) {
            photoThumbnailUrls.value[photo.id] = photo.imageUrl;
          } else if (isPhotoRecord(photo) && photo.thumbnailUrl) {
            photoThumbnailUrls.value[photo.id] = photo.thumbnailUrl;
          }
        }
      });
    }
  },
  { deep: true }
);

const handleCopyBilling = async () => {
  const lines: string[] = [];
  Object.entries(groupedPhotos.value).forEach(([space, group]) => {
    const constructions = getConstructionsForSpace(group);
    constructions.forEach((construction: string) => {
      const key = `${space}-${construction}`;
      const amount = billingAmounts.value[key];
      if (amount !== undefined) {
        const label = [space, construction].filter(Boolean).join(' ');
        lines.push(
          `${label || t('report.billingSection.uncategorized')} $${amount.toLocaleString('zh-TW')}`
        );
      }
    });
  });
  if (grandTotal.value > 0) {
    lines.push('');
    lines.push(
      `${t('report.generationSheet.grandTotal')}$${grandTotal.value.toLocaleString('zh-TW')}`
    );
  }
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch {
    // ignore
  }
};

const handleDownload = () => {
  // Filter out undefined values from billing amounts
  const billingAmountsFiltered: Record<string, number> = {};
  if (purpose.value === Purpose.Billing) {
    for (const [key, value] of Object.entries(billingAmounts.value)) {
      if (value !== undefined && value !== null) {
        billingAmountsFiltered[key] = value;
      }
    }
  }

  const data = {
    purpose: purpose.value,
    groups: groupedPhotos.value,
    billing: purpose.value === Purpose.Billing ? billingAmountsFiltered : null,
    groupNotes: groupReportNotes.value,
    photoNotes: photoReportNotes.value,
    followUpGroups: purpose.value === Purpose.FollowUp ? followUpGroups.value : undefined,
  };

  if (exportFormat.value === 'pdf') {
    emit('download-pdf', data);
  } else {
    emit('download-word', data);
  }
};
</script>

<style scoped>
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: all 0.3s ease;
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
