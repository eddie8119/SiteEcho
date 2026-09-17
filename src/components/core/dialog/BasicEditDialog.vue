<template>
  <ElDialog
    v-model="dialogVisible"
    class="panel-color-difference"
    :width="computedWidth"
    :title="title"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    :show-close="showClose"
    :z-index="40"
    center
    align-center
    @close="onCancel"
  >
    <ElForm
      label-width="110px"
      class="device-form text-color-difference text-lg"
      @submit.prevent="onSubmit"
    >
      <slot />
    </ElForm>

    <!-- Error Message Display -->
    <div v-if="errorMessage" class="error-message">
      <ElAlert :title="errorMessage" type="error" show-icon :closable="false" />
    </div>

    <span class="mt-5 flex items-center gap-3">
      <slot name="footer-left" />
      <div class="flex-grow" />
      <slot
        v-if="showFooterButton"
        name="footer"
        :on-cancel="onCancel"
        :on-submit="onSubmit"
        :is-submitting="isSubmitting"
      >
        <TextButton size="md" variant="outline" @click="onCancel">
          {{ t('button.cancel') }}
        </TextButton>

        <TextButton
          variant="primary"
          :disabled="isSubmitting || isInvalid"
          :loading="isSubmitting"
          size="md"
          @click="onSubmit"
        >
          {{ t('button.submit') }}
        </TextButton>
      </slot>
    </span>
  </ElDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';
import { useResponsiveWidth } from '@/composables/ui/useResponsiveWidth';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    isSubmitting?: boolean;
    errorMessage?: string;
    showFooterButton?: boolean;
    isInvalid?: boolean;
    width?: string;
    showClose?: boolean;
  }>(),
  {
    modelValue: false,
    title: '',
    isSubmitting: false,
    errorMessage: '',
    showFooterButton: true,
    width: undefined,
    showClose: true,
  }
);

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const { t } = useI18n();
const { isMobile } = useResponsiveWidth();

const computedWidth = computed(() => {
  if (isMobile.value) return '80vw';
  return props.width ?? '500px';
});

const onSubmit = () => {
  emit('submit');
};

const onCancel = () => {
  emit('cancel');
  emit('update:modelValue', false);
};
</script>

<style lang="scss">
.el-dialog__title {
  color: var(--color-primary-text);
  font-weight: 700;
  font-size: 1rem;
}
</style>

<style lang="scss" scoped>
.flex-grow {
  flex-grow: 1;
}

.error-message {
  margin: 16px 0;

  :deep(.el-alert) {
    margin-bottom: 0;
    border-radius: 4px;
  }

  :deep(.el-alert__title) {
    font-size: 14px;
    line-height: 1.5;
  }
}
</style>
