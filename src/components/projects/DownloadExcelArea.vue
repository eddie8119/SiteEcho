<template>
  <TextButton
    type="button"
    variant="secondary"
    size="sm"
    class="px-2 sm:w-auto"
    :disabled="!project"
    @click="handleDownloadProject"
    ><img src="@/assets/icons/Download.png" alt="Download" class="mr-1 h-4 w-4" />
    {{ t('button.download') }}
  </TextButton>
</template>

<script setup lang="ts">
import { Workbook } from 'exceljs';
import { useI18n } from 'vue-i18n';

import type { ProjectResponse, TaskResponse } from '@/types/response';

import TextButton from '@/components/core/button/TextButton.vue';
import { createProjectWorksheet, downloadWorkbook } from '@/config/projectExcelConfig';
import { formatMonthDay } from '@/utils/date';

const props = defineProps<{
  project: ProjectResponse;
  tasks: TaskResponse[] | undefined;
}>();

const { t } = useI18n();

// 下載 Project Excel
const handleDownloadProject = async () => {
  try {
    const project = props.project;
    const tasks = props.tasks;

    // 建立 Workbook
    const workbook = new Workbook();

    // 建立 Worksheet
    createProjectWorksheet(workbook, project, t, tasks ?? []);

    // 產生並下載 Excel
    const dateLabel = formatMonthDay(new Date());
    await downloadWorkbook(workbook, `${project.name}_${dateLabel}.xlsx`);
  } catch (error) {
    console.error('下載失敗:', error);
  }
};
</script>

<style scoped></style>
