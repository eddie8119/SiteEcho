<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="title"
    :show-footer-button="false"
    :show-close="false"
    width="400px"
  >
    <div class="import-progress-container">
      <div class="progress-text">{{ message }}</div>
      <ElProgress
        :percentage="progress"
        :stroke-width="12"
        :show-text="true"
        :format="formatProgress"
      />
      <div v-if="showDetails" class="progress-details">
        {{ t('setting.backup.processed_count', { current: processed, total: total }) }}
      </div>
    </div>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { ElProgress } from 'element-plus';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    progress: number;
    processed?: number;
    total?: number;
    title?: string;
    message?: string;
    showDetails?: boolean;
  }>(),
  {
    modelValue: false,
    progress: 0,
    processed: 0,
    total: 0,
    title: '',
    message: '',
    showDetails: true,
  }
);

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const title = computed(() => props.title || t('setting.backup.importing'));
const message = computed(() => props.message || t('setting.backup.import_progress_message'));

const formatProgress = (percentage: number) => {
  return `${percentage}%`;
};
</script>

<style lang="scss" scoped>
.import-progress-container {
  padding: 20px 0;
  text-align: center;
}

.progress-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-primary-text);
  margin-bottom: 20px;
}

.progress-details {
  margin-top: 12px;
  font-size: 14px;
  color: var(--color-secondary-text);
}

:deep(.el-progress__text) {
  font-size: 16px !important;
  font-weight: 600;
}

:deep(.el-progress-bar__outer) {
  background-color: var(--color-progress-bg);
}

:deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  transition: width 0.3s ease;
}
</style>
