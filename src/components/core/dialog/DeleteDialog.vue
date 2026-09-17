<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :is-submitting="isSubmitting"
    :error-message="errorMessage"
    :is-invalid="isCrucial ? isInvalid : false"
    :show-footer-button="props.showFooterButton ?? true"
    @submit="onSubmit"
    @cancel="handleCancelWithComposable"
  >
    <div class="flex items-center">
      <div
        class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100"
      >
        <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
    </div>
    <div class="space-y-2 text-center">
      <slot name="body">
        <p class="leading-relaxed">
          <template v-if="props.bodyText">
            {{ props.bodyText }}
          </template>
          <template v-else>
            {{ t('dialog.delete_confirm') }}
            <span class="text-base font-semibold text-secondary-red">
              {{ props.subject }}: {{ props.target }}
            </span>
            ?
          </template>
          <span v-if="props.additionalInfo" class="block">
            {{ props.additionalInfo }}
          </span>
        </p>
      </slot>

      <div v-if="props.isCrucial" class="">
        <p class="leading-relaxed">
          {{ t('message.sign.confirm_delete_input') }}
          <span class="font-semibold text-secondary-red">{{ props.target }}</span>
        </p>

        <ElInput v-model="typeCheck" class="mt-4" :placeholder="props.placeholder" />
      </div>
    </div>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import { useDialogReset } from '@/composables/useDialogReset';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    isCrucial?: boolean;
    target: string;
    subject?: string;
    bodyText?: string;
    additionalInfo?: string;
    showFooterButton?: boolean;
    placeholder?: string;
  }>(),
  {
    isCrucial: false,
    subject: '',
    bodyText: '',
    additionalInfo: '',
    showFooterButton: true,
    placeholder: '',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
}>();

const { t } = useI18n();

const errorMessage = ref<string>('');
const isSubmitting = ref(false);
const typeCheck = ref<string>('');

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
const isInvalid = computed(() => typeCheck.value !== props.target);

const dialogTitle = computed(() => {
  if (props.subject) {
    return `${props.subject}${t('title.delete_confirm')}`;
  }
  return t('title.delete_confirm');
});

const resetDialogState = () => {
  typeCheck.value = '';
  errorMessage.value = '';
};

const onSubmit = async () => {
  try {
    isSubmitting.value = true;
    // 觸發確認刪除事
    emit('confirm');
    // 關閉彈窗
    dialogVisible.value = false;
  } catch (error) {
    console.error('Failed to delete item:', error);
    errorMessage.value = t('dialog.delete_dialog.delete_failed');
  } finally {
    resetDialogState();
    isSubmitting.value = false;
  }
};

const { createCancelHandler } = useDialogReset(() => props.modelValue, resetDialogState);
// align with BasicEditDialog cancel behavior
const handleCancelWithComposable = createCancelHandler(() => (dialogVisible.value = false));
</script>
