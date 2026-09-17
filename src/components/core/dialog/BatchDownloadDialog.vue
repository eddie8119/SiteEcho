<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="t('title.batch_download')"
    :is-submitting="isSubmitting"
    :error-message="errorMessage"
    :show-footer-button="false"
    @cancel="onCancel"
  >
    <div class="space-y-4">
      <!-- 控制列：全選勾選框 + 快捷按鈕 + 已選數量 -->
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-3">
          <UiCheckbox
            :model-value="isAllSelected"
            :indeterminate="isIndeterminate"
            @update:model-value="toggleSelectAll"
          />
          <span class="text-color-difference text-sm">{{ selectedCount }} / {{ totalCount }}</span>
        </div>

        <div class="flex gap-2">
          <TextButton variant="quick" size="sm" class="h-[30px]" @click="selectAll">
            {{ t('button.select_all') }}
          </TextButton>
          <TextButton variant="quick" size="sm" class="h-[30px]" @click="clearAll">
            <img src="@/assets/icons/Clear.svg" alt="Clear" class="mr-1 h-4 w-4" />{{
              t('button.select_clear')
            }}
          </TextButton>
        </div>
      </div>

      <!-- Projects 列表 -->
      <div class="max-h-[400px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
        <div v-if="projectList.length === 0" class="text-center text-gray-500">
          {{ t('common.none') }}
        </div>
        <div v-for="project in projectList" :key="project.id" class="flex items-center gap-2">
          <UiCheckbox v-model="selectedProjectIds" :value="project.id">
            <span class="text-sm">{{ project.name }}</span>
          </UiCheckbox>
        </div>
      </div>

      <!-- 下載按鈕 -->
      <div class="flex justify-end">
        <TextButton
          variant="secondary"
          size="sm"
          class="h-[30px] w-[100px]"
          :disabled="selectedProjectIds.length === 0 || isSubmitting"
          @click="handleBatchDownloadProject"
        >
          {{ t('button.download') }}
          <span v-if="selectedCount > 0" class="ml-1">({{ selectedCount }})</span>
        </TextButton>
      </div>
    </div>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ProjectResponse, TaskResponse } from '@/types/response';

import TextButton from '@/components/core/button/TextButton.vue';
import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import UiCheckbox from '@/components/ui/UiCheckbox.vue';
import { useDialogReset } from '@/composables/useDialogReset';
import { createWorkbookWithProjects, downloadWorkbook } from '@/config/projectExcelConfig';
import { formatMonthDay } from '@/utils/date';

const props = defineProps<{
  modelValue: boolean;
  projects: ProjectResponse[] | undefined;
  tasks: TaskResponse[] | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();

const errorMessage = ref<string>('');
const isSubmitting = ref(false);
const selectedProjectIds = ref<string[]>([]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const projectList = computed(() => props.projects ?? []);

// 全選
const selectAll = () => {
  selectedProjectIds.value = projectList.value.map((p) => p.id);
};

// 全清
const clearAll = () => {
  selectedProjectIds.value = [];
};

// 計算屬性：數量與狀態
const totalCount = computed(() => projectList.value.length);
const selectedCount = computed(() => selectedProjectIds.value.length);
const isAllSelected = computed(
  () => totalCount.value > 0 && selectedCount.value === totalCount.value
);
const isIndeterminate = computed(
  () => selectedCount.value > 0 && selectedCount.value < totalCount.value
);

// 切換全選
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    clearAll();
  } else {
    selectAll();
  }
};

// UiCheckbox 內建支援 indeterminate 視覺狀態，由傳入的 prop 控制

/**
 * 批次下載 Projects Excel
 */
const handleBatchDownloadProject = async () => {
  if (selectedProjectIds.value.length === 0) {
    ElMessage.warning(t('message.please_select_project'));
    return;
  }

  try {
    isSubmitting.value = true;
    errorMessage.value = '';

    const selectedProjects = projectList.value.filter((p) =>
      selectedProjectIds.value.includes(p.id)
    );

    // 建立 Workbook 並下載
    const workbook = createWorkbookWithProjects(selectedProjects, t, props.tasks ?? []);
    const dateLabel = formatMonthDay(new Date());
    await downloadWorkbook(
      workbook,
      `${t('project.project')}${t('button.batch_download')}_${dateLabel}.xlsx`
    );

    ElMessage.success(t('message.download_success'));
    dialogVisible.value = false;
  } catch (error) {
    console.error('批次下載失敗:', error);
    errorMessage.value = t('message.download_failed');
    ElMessage.error(t('message.download_failed'));
  } finally {
    isSubmitting.value = false;
  }
};

const resetDialogState = () => {
  selectedProjectIds.value = [];
  errorMessage.value = '';
  isSubmitting.value = false;
};

const { createCancelHandler } = useDialogReset(() => props.modelValue, resetDialogState);
const onCancel = createCancelHandler(() => (dialogVisible.value = false));
</script>
