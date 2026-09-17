<template>
  <MobileTimelinePage
    :filters="filters"
    :active-filters="activeFilters"
    :has-active-filters="hasActiveFilters"
    :is-multi-select-mode="isMultiSelectMode"
    :selected-photos="selectedPhotos"
    :selection-summary="selectionSummary"
    :show-delete-confirm="showDeleteConfirm"
    :show-space-picker="showSpacePicker"
    :show-construction-picker="showConstructionPicker"
    :show-report-sheet="showReportSheet"
    :show-share-record-sheet="showShareRecordSheet"
    :share-photo-ids="sharePhotoIds"
    :toast-message="toastMessage"
    :space-options="spaceOptions"
    :construction-options="constructionOptions"
    :local-photos="localPhotos"
    :filtered-photos="filteredPhotos"
    :grouped-local-photos="groupedLocalPhotos"
    :follow-up-photos-by-parent-id="followUpPhotosByParentId"
    :status-filter="statusFilter"
    :pending-count="pendingCount"
    :resolved-count="resolvedCount"
    :show-register-prompt="showRegisterPrompt"
    :restored-report-data="restoredReportData"
    :initial-group-notes="currentProjectGroupNotes"
    @update-search-text="handleSearchTextChange"
    @toggle-status-filter="handleToggleStatusFilter"
    @remove-filter="removeFilter"
    @clear-all-filters="clearAllFilters"
    @clear-selection="clearSelection"
    @request-delete="requestDelete"
    @execute-delete="executeDelete"
    @update-show-delete-confirm="showDeleteConfirm = $event"
    @update-show-space-picker="showSpacePicker = $event"
    @update-show-construction-picker="showConstructionPicker = $event"
    @update-show-report-sheet="handleShowReportSheet"
    @batch-set-space="handleBatchSetSpace"
    @batch-set-construction="handleBatchSetConstruction"
    @add-space-option="handleAddSpaceOption"
    @add-construction-option="handleAddConstructionOption"
    @edit-space-option="handleEditSpaceOption"
    @edit-construction-option="handleEditConstructionOption"
    @delete-space-option="handleDeleteSpaceOption"
    @delete-construction-option="handleDeleteConstructionOption"
    @download-pdf="handleDownloadPdf"
    @download-word="handleDownloadWord"
    @close-toast="toastMessage = ''"
    @show-toast="toastMessage = $event"
    @photo-click="handlePhotoClick"
    @photo-touchstart="handlePhotoTouchStart"
    @photo-touchend="handlePhotoTouchEnd"
    @photo-mousedown="handlePhotoMouseDown"
    @photo-mouseup="handlePhotoMouseUp"
    @space-click="handleSpaceClick"
    @construction-click="handleConstructionClick"
    @toggle-evidence="handleToggleEvidence"
    @share="handleShare"
    @update-show-share-record-sheet="showShareRecordSheet = $event"
    @import-click="triggerFilePicker"
  />

  <input
    ref="fileInput"
    type="file"
    multiple
    accept="image/*"
    class="hidden"
    @change="handleFileChange"
  />

  <ImportSettingsSheet
    v-model="showImportSettings"
    :photo-count="filesToImport.length"
    :space-options="spaceOptions"
    :construction-options="constructionOptions"
    @confirm="handleImportConfirm"
    @add-space="handleAddSpaceOption"
    @add-construction="handleAddConstructionOption"
  />

  <ImportProgressOverlay
    :is-visible="isImporting"
    :progress="importProgress"
    :current="importedCount"
    :total="totalToImport"
  />

  <!-- Registration Prompt -->
  <RegisterPromptSheet
    v-model="showRegisterPrompt"
    :reason="promptReason"
    :photo-count="localPhotos.length"
    @login="redirectToLogin"
  />

  <!-- Upgrade Prompt -->
  <UpgradePromptSheet
    v-model="showUpgradePrompt"
    :title="t('timeline.messages.upgrade_prompt_title')"
    :description="t('timeline.messages.upgrade_prompt_description', { count: FREE_REPORT_LIMIT })"
  />

  <BackupConfirmSheet
    v-model="showBackupConfirm"
    :photo-count="selectedPhotos.size"
    @confirm="executeConfirmedAction"
  />

  <!-- Hidden PDF Template for capturing -->
  <div
    v-if="pdfReportData"
    style="
      position: fixed;
      left: 0;
      top: 0;
      width: 794px;
      opacity: 0;
      pointer-events: none;
      z-index: -9999;
    "
  >
    <div ref="pdfRef">
      <FollowUpReportPdfTemplate
        v-if="pdfReportData.purpose === 'follow_up'"
        :project-title="currentProjectName"
        :follow-up-groups="pdfReportData.followUpGroups || []"
        :photo-urls="pdfPhotoUrls"
      />
      <ReportPdfTemplate
        v-else
        :project-title="currentProjectName"
        :purpose="pdfReportData.purpose"
        :groups="pdfReportData.groups"
        :group-notes="pdfReportData.groupNotes"
        :photo-notes="pdfReportData.photoNotes"
        :billing="pdfReportData.billing"
        :photo-urls="pdfPhotoUrls"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import type { LocalPhoto, PhotoRecord, Project } from '@/types/photo';
import type { GroupedPhotos } from '@/types/report';

import { deletePhotoByClientId, photoApi } from '@/api/photo';
import { projectApi } from '@/api/project';
import RegisterPromptSheet from '@/components/auth/RegisterPromptSheet.vue';
import UpgradePromptSheet from '@/components/billing/UpgradePromptSheet.vue';
import BackupConfirmSheet from '@/components/timeline/BackupConfirmSheet.vue';
import ImportProgressOverlay from '@/components/timeline/ImportProgressOverlay.vue';
import ImportSettingsSheet from '@/components/timeline/ImportSettingsSheet.vue';
import MobileTimelinePage from '@/components/timeline/MobileTimelinePage.vue';
import FollowUpReportPdfTemplate from '@/components/timeline/report/FollowUpReportPdfTemplate.vue';
import ReportPdfTemplate from '@/components/timeline/report/ReportPdfTemplate.vue';
import { useSubscription } from '@/composables/query/useSubscription';
import { useTimelineBatchOptions } from '@/composables/timeline/useTimelineBatchOptions';
import {
  useMobileTimelinePhotoView,
  useTimelinePhotosSource,
} from '@/composables/timeline/useTimelinePhotos';
import { useTimelineShare } from '@/composables/timeline/useTimelineShare';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { useDebouncedPhotoSync } from '@/composables/useDebouncedPhotoSync';
import { type ImportSettings, usePhotoImport } from '@/composables/usePhotoImport';
import { usePhotoSync } from '@/composables/usePhotoSync';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { useTimelineFilter } from '@/composables/useTimelineFilter';
import { EvidenceAction, useTimelineMultiSelect } from '@/composables/useTimelineMultiSelect';
import { FREE_REPORT_LIMIT } from '@/config/planConfig';
import { PendingType, PhotoSyncLevel, SyncStatus } from '@/types/photo';
import { Purpose } from '@/types/report';
import { AnalyticsEvent, track } from '@/utils/analytics';
import {
  getProjectFromIndexedDB,
  markPhotosAsReportedInIndexedDB,
  saveProjectToIndexedDB,
  updatePhotoInIndexedDB,
  updateProjectInIndexedDB,
} from '@/utils/indexedDB';
import { logError, logWarn } from '@/utils/logger';
import { generatePdfFromElement } from '@/utils/pdfGenerator';
import { generateWordFromData } from '@/utils/wordGenerator';

const { t } = useI18n();
const route = useRoute();
const store = useCurrentProject();
const currentProjectId = computed(() => store.currentProjectId);
const currentProjectName = computed(
  () => store.currentProjectName || t('timeline.messages.project_report')
);
const currentProjectGroupNotes = ref<Record<string, string>>({});

// Watch route.query.projectId (e.g. redirected from invitation accept) and switch project
watch(
  () => route.query.projectId,
  async (targetProjectId) => {
    if (!targetProjectId || typeof targetProjectId !== 'string') return;
    try {
      const projects = await projectApi.getProjects();
      const remoteProjects = projects.data || [];
      const matched = remoteProjects.find(
        (p) => p.id === targetProjectId || p.clientId === targetProjectId
      );
      if (matched) {
        const projectId = matched.clientId ?? matched.id;
        const localProject: Project = {
          id: projectId,
          clientId: matched.clientId ?? projectId,
          name: matched.name,
          userId: matched.userId,
          ownerName: matched.ownerName,
          ownerEmail: matched.ownerEmail,
          isShared: matched.isShared,
          createdAt: new Date(matched.createdAt),
          lastUsedAt: new Date(matched.lastUsedAt ?? matched.updatedAt ?? matched.createdAt),
          updatedAt: new Date(matched.updatedAt),
          synced: true,
          syncStatus: SyncStatus.DONE,
          isDeleted: false,
        };
        await saveProjectToIndexedDB(localProject);
        store.setCurrentProject(localProject);
        await refreshTimelineProjectPhotos();
      }
    } catch (err) {
      logWarn('Failed to switch project from route query:', err, 'Timeline');
    }
  },
  { immediate: true }
);

// Watch currentProjectId to resync photos when project changes in timeline
watch(
  () => currentProjectId.value,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      await refreshTimelineProjectPhotos();
    }
  }
);

// Photo sync for bidirectional sync with Web
const { syncProject } = usePhotoSync();

// Debounced sync for photo edits
const { triggerSync, triggerDelete, flushSync } = useDebouncedPhotoSync();

const TIMELINE_PROJECT_SYNC_COOLDOWN_MS = 2000;
let timelineProjectSyncInFlight: Promise<void> | null = null;
let lastTimelineProjectSyncAt = 0;

const syncProjectPhotos = async () => {
  if (currentProjectId.value) {
    try {
      await syncProject(currentProjectId.value);
      // Add a delay to ensure IndexedDB transactions are completed before reloading
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Reload local photos after sync to refresh UI
      await loadLocalPhotos();
    } catch (error) {
      logWarn('Sync project photos failed:', error, 'Timeline');
    }
  }
};

const refreshTimelineProjectPhotos = async () => {
  const now = Date.now();

  if (timelineProjectSyncInFlight) {
    return timelineProjectSyncInFlight;
  }

  if (now - lastTimelineProjectSyncAt < TIMELINE_PROJECT_SYNC_COOLDOWN_MS) {
    return;
  }

  lastTimelineProjectSyncAt = now;
  timelineProjectSyncInFlight = (async () => {
    try {
      await loadLocalPhotos();
      await syncProjectPhotos();
    } finally {
      timelineProjectSyncInFlight = null;
    }
  })();

  return timelineProjectSyncInFlight;
};

const { isImporting, importProgress, totalToImport, importedCount, importPhotos } =
  usePhotoImport();

const fileInput = ref<HTMLInputElement | null>(null);
const filesToImport = ref<File[]>([]);
const showImportSettings = ref(false);

const triggerFilePicker = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    filesToImport.value = Array.from(input.files);
    showImportSettings.value = true;
  }
  // Reset input so the same files can be selected again if needed
  input.value = '';
};

const handleImportConfirm = async (settings: ImportSettings) => {
  if (filesToImport.value.length === 0) return;

  if (!currentProjectId.value) {
    toastMessage.value = t('timeline.messages.select_project_first');
    return;
  }

  const count = await importPhotos(filesToImport.value, currentProjectId.value, settings);

  const hasSpaceOrConstruction =
    settings.space || (settings.constructions && settings.constructions.length > 0);
  toastMessage.value = hasSpaceOrConstruction
    ? t('timeline.messages.import_success', { count })
    : t('timeline.messages.import_success_no_space', { count });
  loadLocalPhotos();
  filesToImport.value = [];
};

const statusFilter = ref<'all' | 'pending' | 'resolved'>('all');
const showReportSheet = ref(false);

const handleToggleStatusFilter = (filter: 'pending' | 'resolved') => {
  if (statusFilter.value === filter) {
    statusFilter.value = 'all';
  } else {
    statusFilter.value = filter;
  }
  track(AnalyticsEvent.FILTER_USED);
};
const showShareRecordSheet = ref(false);
const sharePhotoIds = ref<string[]>([]);
const showBackupConfirm = ref(false);
const pendingAction = ref<(() => Promise<void>) | null>(null);

const executeConfirmedAction = async () => {
  showBackupConfirm.value = false;
  if (pendingAction.value) {
    await pendingAction.value();
    pendingAction.value = null;
  }
};

const checkBackupLimit = (action: () => Promise<void>) => {
  if (selectedPhotos.value.size > 20) {
    pendingAction.value = action;
    showBackupConfirm.value = true;
    return false;
  }
  return true;
};

const {
  showRegisterPrompt,
  showUpgradePrompt,
  promptReason,
  checkExportReportTrigger,
  redirectToLogin,
  getLoginRedirectContext,
  clearLoginRedirectContext,
  consumeReportExport,
  isSubscribed,
  syncPhotos,
  updatePhotoCount,
} = useRegistrationFlow();

const { refetchSubscription } = useSubscription();

const handleShowReportSheet = async (value: boolean) => {
  if (value && currentProjectId.value) {
    // Reload photos to ensure we have the latest reportNote values
    await loadLocalPhotos();

    // Load project groupReportNotes when opening report sheet
    try {
      const project = await getProjectFromIndexedDB(currentProjectId.value);
      if (project && project.groupReportNotes) {
        currentProjectGroupNotes.value = project.groupReportNotes;
      } else {
        currentProjectGroupNotes.value = {};
      }
    } catch (error) {
      logWarn('Failed to load project group notes:', error, 'Timeline');
      currentProjectGroupNotes.value = {};
    }
  }
  showReportSheet.value = value;
};

const pdfRef = ref<HTMLElement | null>(null);
const pdfReportData = ref<ReportData | null>(null);
const pdfPhotoUrls = ref<Record<string, string>>({});
const restoredReportData = ref<{
  purpose: Purpose | null;
  billing: Record<string, number> | null;
} | null>(null);

interface ReportData {
  purpose: string | null;
  groups: GroupedPhotos;
  billing: Record<string, number> | null;
  groupNotes?: Record<string, string>;
  photoNotes?: Record<string, string>;
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
}

const handleDownloadPdf = async (data: ReportData) => {
  // Check authentication and subscription at download time (better conversion timing)
  const canExport = checkExportReportTrigger();
  if (!canExport) {
    // Save current state before showing login prompt
    sessionStorage.setItem(
      'login_redirect_context',
      JSON.stringify({
        route: 'timeline',
        selectedPhotoIds: Array.from(selectedPhotos.value),
        reportData: {
          purpose: data.purpose,
          billing: data.billing,
        },
      })
    );
    return;
  }

  const action = async () => {
    try {
      if (!(await consumeReportExport())) {
        showUpgradePrompt.value = true;
        return;
      }

      showReportSheet.value = false;
      toastMessage.value = t('timeline.messages.report_preparing');

      // 1. Prepare data and photo URLs
      pdfReportData.value = data;

      // Convert Blobs to Object URLs
      const urls: Record<string, string> = {};

      if (data.purpose === 'follow_up' && data.followUpGroups) {
        // Handle follow-up report photo URLs
        data.followUpGroups.forEach((group) => {
          urls[group.parentPhoto.id] = URL.createObjectURL(group.parentPhoto.file);
          group.followUpPhotos.forEach((photo) => {
            urls[photo.id] = URL.createObjectURL(photo.file);
          });
        });
      } else {
        // Handle regular report photo URLs
        for (const space in data.groups) {
          for (const photoId in data.groups[space]) {
            const item = data.groups[space][photoId];
            urls[item.photo.id] = URL.createObjectURL(item.photo.file);
          }
        }
      }
      pdfPhotoUrls.value = urls;

      // 2. Wait for template to render
      await nextTick();

      // Wait for all images to load
      const loadPromises: Promise<void>[] = [];

      if (data.purpose === 'follow_up' && data.followUpGroups) {
        // Load follow-up report images
        data.followUpGroups.forEach((group) => {
          const imgPromise = new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load image ${group.parentPhoto.id}`));
            img.src = urls[group.parentPhoto.id];
          });
          loadPromises.push(imgPromise);

          group.followUpPhotos.forEach((photo) => {
            const imgPromise = new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => reject(new Error(`Failed to load image ${photo.id}`));
              img.src = urls[photo.id];
            });
            loadPromises.push(imgPromise);
          });
        });
      } else {
        // Load regular report images
        for (const space in data.groups) {
          for (const photoId in data.groups[space]) {
            const item = data.groups[space][photoId];
            const imgPromise = new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => reject(new Error(`Failed to load image ${item.photo.id}`));
              img.src = urls[item.photo.id];
            });
            loadPromises.push(imgPromise);
          }
        }
      }

      toastMessage.value = t('timeline.messages.loading_images');
      await Promise.all(loadPromises);

      // Additional delay to ensure rendering is complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!pdfRef.value) throw new Error('PDF Template not found');

      toastMessage.value = t('timeline.messages.generating_pdf');

      // 3. Generate PDF
      const dateLabel = new Date().toISOString().split('T')[0];
      const fileName = `${currentProjectName.value}_報告_${dateLabel}.pdf`;

      await generatePdfFromElement(pdfRef.value, fileName);

      // 5. Mark photos as reported and upgrade to Layer 3
      const photoIds: string[] = [];
      const updatePromises: Promise<void>[] = [];

      for (const space in data.groups) {
        for (const photoId in data.groups[space]) {
          photoIds.push(photoId);
          // Update reportNote if provided
          if (data.photoNotes && data.photoNotes[photoId] !== undefined) {
            updatePromises.push(
              updatePhotoInIndexedDB(photoId, {
                reportNote: data.photoNotes[photoId],
              })
            );
          }
        }
      }

      // Update project groupReportNotes if provided
      if (data.groupNotes && currentProjectId.value) {
        // Convert Proxy to plain object for IndexedDB and API
        const groupNotesPlain: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.groupNotes)) {
          groupNotesPlain[key] = value;
        }

        try {
          await updateProjectInIndexedDB(currentProjectId.value, {
            groupReportNotes: groupNotesPlain,
          });

          // Try to sync to server if project exists on server
          try {
            // Get the server project ID from the projects list
            const projects = await projectApi.getProjects();
            if (projects.success && projects.data) {
              const serverProject = projects.data.find(
                (p) => p.clientId === currentProjectId.value
              );
              if (serverProject?.id) {
                await projectApi.updateProject(serverProject.id, {
                  groupReportNotes: groupNotesPlain,
                });
              }
            }
          } catch (syncError) {
            logWarn('Failed to sync groupReportNotes to server:', syncError, 'Timeline');
            // Don't throw error, local update succeeded
          }
        } catch (error) {
          if (error instanceof Error && error.message?.includes('not found')) {
            const projectToSave: Project = {
              id: currentProjectId.value,
              name: currentProjectName.value || t('timeline.messages.project'),
              createdAt: new Date(),
              lastUsedAt: new Date(),
              updatedAt: new Date(),
              groupReportNotes: groupNotesPlain,
            };
            await saveProjectToIndexedDB(projectToSave);
          } else {
            throw error;
          }
        }
      }

      await Promise.all([markPhotosAsReportedInIndexedDB(photoIds), ...updatePromises]);
      await updatePhotoCount();
      await syncPhotos();

      // Reload photos from IndexedDB to ensure single source of truth
      await loadLocalPhotos();

      // Update local project group notes state
      if (data.groupNotes) {
        currentProjectGroupNotes.value = data.groupNotes;
      }

      // 6. Cleanup
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
      pdfReportData.value = null;
      pdfPhotoUrls.value = {};

      toastMessage.value = t('timeline.messages.report_generated_downloading');
    } catch (error) {
      logError('Failed to generate PDF:', error, 'Timeline');
      toastMessage.value = t('timeline.messages.report_generation_failed');

      // Cleanup on error
      if (pdfPhotoUrls.value) {
        Object.values(pdfPhotoUrls.value).forEach((url) => URL.revokeObjectURL(url));
      }
      pdfReportData.value = null;
      pdfPhotoUrls.value = {};
    }
  };

  if (checkBackupLimit(action)) {
    await action();
  }
};

const handleDownloadWord = async (data: ReportData) => {
  // Check authentication and subscription at download time (better conversion timing)
  const canExport = checkExportReportTrigger();
  if (!canExport) {
    // Save current state before showing login prompt
    sessionStorage.setItem(
      'login_redirect_context',
      JSON.stringify({
        route: 'timeline',
        selectedPhotoIds: Array.from(selectedPhotos.value),
        reportData: {
          purpose: data.purpose,
          billing: data.billing,
        },
      })
    );
    return;
  }

  const action = async () => {
    try {
      if (!(await consumeReportExport())) {
        showUpgradePrompt.value = true;
        return;
      }

      showReportSheet.value = false;
      toastMessage.value = t('timeline.messages.report_preparing');

      // 1. Prepare data and photo URLs
      const wordPhotoUrls: Record<string, string> = {};
      for (const space in data.groups) {
        for (const photoId in data.groups[space]) {
          const item = data.groups[space][photoId];
          wordPhotoUrls[item.photo.id] = URL.createObjectURL(item.photo.file);
        }
      }

      // 2. Generate Word document
      const dateLabel = new Date().toISOString().split('T')[0];
      const fileName = `${currentProjectName.value}_報告_${dateLabel}.doc`;

      await generateWordFromData(
        {
          projectTitle: currentProjectName.value,
          purpose: data.purpose,
          groups: data.groups,
          groupNotes: data.groupNotes || {},
          photoNotes: data.photoNotes || {},
          billing: data.billing,
          photoUrls: wordPhotoUrls,
        },
        fileName
      );

      // 3. Mark photos as reported and upgrade to Layer 3
      const photoIds: string[] = [];
      const updatePromises: Promise<void>[] = [];

      for (const space in data.groups) {
        for (const photoId in data.groups[space]) {
          photoIds.push(photoId);
          // Update reportNote if provided
          if (data.photoNotes && data.photoNotes[photoId] !== undefined) {
            updatePromises.push(
              updatePhotoInIndexedDB(photoId, {
                reportNote: data.photoNotes[photoId],
              })
            );
          }
        }
      }

      // Update project groupReportNotes if provided
      if (data.groupNotes && currentProjectId.value) {
        // Convert Proxy to plain object for IndexedDB and API
        const groupNotesPlain: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.groupNotes)) {
          groupNotesPlain[key] = value;
        }

        try {
          await updateProjectInIndexedDB(currentProjectId.value, {
            groupReportNotes: groupNotesPlain,
          });

          // Try to sync to server if project exists on server
          try {
            // Get the server project ID from the projects list
            const projects = await projectApi.getProjects();
            if (projects.success && projects.data) {
              const serverProject = projects.data.find(
                (p) => p.clientId === currentProjectId.value
              );
              if (serverProject?.id) {
                await projectApi.updateProject(serverProject.id, {
                  groupReportNotes: groupNotesPlain,
                });
              }
            }
          } catch (syncError) {
            logWarn('Failed to sync groupReportNotes to server:', syncError, 'Timeline');
            // Don't throw error, local update succeeded
          }
        } catch (error) {
          if (error instanceof Error && error.message?.includes('not found')) {
            const projectToSave: Project = {
              id: currentProjectId.value,
              name: currentProjectName.value || t('timeline.messages.project'),
              createdAt: new Date(),
              lastUsedAt: new Date(),
              updatedAt: new Date(),
              groupReportNotes: groupNotesPlain,
            };
            await saveProjectToIndexedDB(projectToSave);
          } else {
            throw error;
          }
        }
      }

      await Promise.all([markPhotosAsReportedInIndexedDB(photoIds), ...updatePromises]);
      await updatePhotoCount();
      await syncPhotos();

      // Reload photos from IndexedDB to ensure single source of truth
      await loadLocalPhotos();

      // Update local project group notes state
      if (data.groupNotes) {
        currentProjectGroupNotes.value = data.groupNotes;
      }

      // 4. Cleanup
      Object.values(wordPhotoUrls).forEach((url) => URL.revokeObjectURL(url));

      toastMessage.value = t('timeline.messages.report_generated_downloading');
    } catch (error) {
      logError('Failed to generate Word:', error, 'Timeline');
      toastMessage.value = t('timeline.messages.report_generation_failed');
    }
  };

  if (checkBackupLimit(action)) {
    await action();
  }
};

const { localPhotos, loadLocalPhotos } = useTimelinePhotosSource();

const {
  filters,
  filteredPhotos: filterResult,
  activeFilters,
  hasActiveFilters,
  addSpaceFilter,
  addConstructionFilter,
  setSearchText,
  removeFilter,
  clearAllFilters,
} = useTimelineFilter(localPhotos);

const {
  pendingCount,
  resolvedCount,
  filteredPhotos,
  groupedLocalPhotos,
  followUpPhotosByParentId,
} = useMobileTimelinePhotoView({
  localPhotos,
  filterResult,
  currentProjectId,
  statusFilter,
});

const {
  isMultiSelectMode,
  selectedPhotos,
  selectionSummary,
  showDeleteConfirm,
  handlePhotoMouseDown,
  handlePhotoMouseUp,
  handlePhotoTouchStart,
  handlePhotoTouchEnd,
  handlePhotoClick,
  clearSelection,
  requestDelete,
  executeDelete: executeDeleteOriginal,
  batchSetSpace,
  batchSetConstruction,
} = useTimelineMultiSelect(localPhotos);

// Wrapper for executeDelete to trigger immediate soft delete sync
const executeDelete = async (evidenceAction?: EvidenceAction) => {
  const selected = localPhotos.value.filter((p) => selectedPhotos.value.has(p.id));

  // Execute original delete logic
  await executeDeleteOriginal(evidenceAction);

  // Trigger immediate soft delete sync for Layer 2/3 evidence photos only (30-day recovery)
  // Layer1 photos are not synced to cloud, so no need to sync their deletion
  const needsSync = (syncLevel: string, isEvidence: boolean): boolean => {
    return (
      syncLevel === PhotoSyncLevel.THUMBNAIL || syncLevel === PhotoSyncLevel.EVIDENCE || isEvidence
    );
  };

  // Only sync evidence photos (Layer2~3) when in Trash mode
  const evidencePhotos = selected.filter(
    (p) => p.isEvidence && p.synced && needsSync(p.syncLevel, p.isEvidence)
  );
  if (evidenceAction === EvidenceAction.Trash && evidencePhotos.length > 0) {
    const syncPayload = evidencePhotos.map((p) => ({
      clientId: p.id,
      projectId: p.projectId,
      takenAt: p.takenAt.toISOString(),
      constructions: p.constructions,
      space: p.space,
      status: p.status,
      pendingType: p.pendingType,
      note: p.note,
      reportNote: p.reportNote,
      fileBase64: '', // No need to re-upload file for delete
      syncLevel: p.syncLevel,
      isEvidence: p.isEvidence,
      isSampled: p.isSampled,
      isReported: p.isReported,
      shares: p.shares as unknown as Record<string, unknown>[],
      deletedAt: new Date().toISOString(), // Set deletedAt for soft delete
    }));

    const response = await photoApi.sync(syncPayload);
    if (response.success) {
      // Mark synced photos as done
      for (const photo of evidencePhotos) {
        await updatePhotoInIndexedDB(photo.id, {
          syncStatus: SyncStatus.DONE,
        });
      }
    }
  } else if (evidenceAction === EvidenceAction.Permanent && evidencePhotos.length > 0) {
    // Permanent delete: remove from cloud immediately for synced photos
    for (const photo of evidencePhotos) {
      const success = await deletePhotoByClientId(photo.id);
      if (!success) {
        logError(
          `[executeDelete] Failed to delete photo ${photo.id} from cloud`,
          undefined,
          'Timeline'
        );
      }
    }
  }
};

const selectedPhotosList = computed(() =>
  localPhotos.value.filter((p) => selectedPhotos.value.has(p.id))
);

const { share } = useTimelineShare(selectedPhotosList);

const handleShare = async () => {
  const action = async () => {
    const ids = Array.from(selectedPhotos.value);
    toastMessage.value = t('timeline.messages.preparing_share_content');
    const result = await share(currentProjectName.value);

    if (result.success) {
      if (result.copySuccess) {
        toastMessage.value = t('timeline.messages.summary_copied');
      } else {
        toastMessage.value = t('timeline.messages.text_copy_failed');
      }
      sharePhotoIds.value = ids;
      clearSelection();
      // 稍微延遲讓原生分享視窗關閉後再顯示紀錄視窗
      setTimeout(() => {
        showShareRecordSheet.value = true;
      }, 500);
    }
  };

  if (checkBackupLimit(action)) {
    await action();
  }
};

const {
  showSpacePicker,
  showConstructionPicker,
  toastMessage,
  spaceOptions,
  constructionOptions,
  loadOptions,
  handleBatchSetSpace,
  handleBatchSetConstruction,
  handleAddSpaceOption,
  handleAddConstructionOption,
  handleEditSpaceOption,
  handleDeleteSpaceOption,
  handleEditConstructionOption,
  handleDeleteConstructionOption,
} = useTimelineBatchOptions({
  selectedPhotos,
  clearSelection,
  batchSetSpace: async (spaceName) => {
    await batchSetSpace(spaceName);
    // Trigger debounced sync for selected photos
    const selected = localPhotos.value.filter((p) => selectedPhotos.value.has(p.id));
    for (const photo of selected) {
      await triggerSync(photo.id, photo.syncLevel, photo.isEvidence);
    }
  },
  batchSetConstruction: async (constructionNames) => {
    await batchSetConstruction(constructionNames);
    // Trigger debounced sync for selected photos
    const selected = localPhotos.value.filter((p) => selectedPhotos.value.has(p.id));
    for (const photo of selected) {
      await triggerSync(photo.id, photo.syncLevel, photo.isEvidence);
    }
  },
});

const handleSpaceClick = (space: string) => {
  if (!isMultiSelectMode.value) {
    addSpaceFilter(space);
  }
};

const handleConstructionClick = (construction: string) => {
  if (!isMultiSelectMode.value) {
    addConstructionFilter(construction);
  }
};

const handleSearchTextChange = (value: string) => {
  setSearchText(value);
};

const handleToggleEvidence = async (photo: LocalPhoto | PhotoRecord) => {
  const isEvidence = !photo.isEvidence;
  // If set to evidence, syncLevel is EVIDENCE.
  // If unset, check if it was originally sampled (THUMBNAIL) or NONE.
  const syncLevel = isEvidence
    ? PhotoSyncLevel.EVIDENCE
    : photo.isSampled
      ? PhotoSyncLevel.THUMBNAIL
      : PhotoSyncLevel.NONE;

  await updatePhotoInIndexedDB(photo.id, {
    isEvidence,
    syncLevel,
    synced: false,
    syncStatus: SyncStatus.PENDING,
    isDirty: true,
  });

  loadLocalPhotos(); // Refresh local data source

  if (isEvidence) {
    if (isSubscribed.value) {
      toastMessage.value = t('timeline.messages.evidence_set_cloud_upload');
    } else {
      toastMessage.value = t('timeline.messages.evidence_set_local_upgrade');
    }
    // Trigger debounced sync for upgrade.
    await triggerSync(photo.id, syncLevel, isEvidence);
  } else {
    toastMessage.value = t('timeline.messages.evidence_cancelled_local');
    // When downgrading from Layer 3, delete from cloud
    if (photo.synced && photo.syncLevel === PhotoSyncLevel.EVIDENCE) {
      await triggerDelete(photo.id, photo.syncLevel, true);
    }
  }
};

const restoreStateAfterLogin = async () => {
  // Restore state after login
  const context = getLoginRedirectContext();
  if (context && context.route === 'timeline') {
    // Refetch subscription data to ensure we have the latest paid status
    await refetchSubscription();

    // Restore selected photos
    if (context.selectedPhotoIds) {
      context.selectedPhotoIds.forEach((id: string) => {
        selectedPhotos.value.add(id);
      });
    }

    // Restore report sheet state
    if (context.reportData) {
      restoredReportData.value = {
        purpose:
          context.reportData.purpose === 'internal'
            ? Purpose.Internal
            : context.reportData.purpose === 'billing'
              ? Purpose.Billing
              : null,
        billing: context.reportData.billing,
      };
      showReportSheet.value = true;
    }

    // Clear the context after restoration
    clearLoginRedirectContext();
  } else {
    // Clear restored data if no context
    restoredReportData.value = null;
  }
};

const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible') {
    await refreshTimelineProjectPhotos();
  }
};

onMounted(async () => {
  loadOptions();
  restoreStateAfterLogin();
  await refreshTimelineProjectPhotos();

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);
});

onActivated(async () => {
  loadOptions();
  restoreStateAfterLogin();
  await refreshTimelineProjectPhotos();
});

onUnmounted(() => {
  void flushSync();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', handleVisibilityChange);
});
</script>
