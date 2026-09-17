<template>
  <ElDialog
    v-model="dialogVisible"
    class="constructions-dialog"
    width="320px"
    :title="t('dialog.constructions_dialog.title')"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    center
    align-center
    @close="onClose"
  >
    <div class="flex flex-wrap gap-2 py-2">
      <span
        v-for="construction in constructions"
        :key="construction"
        class="rounded bg-orange-50 px-2 py-1 text-sm text-brand-primary"
      >
        {{ construction }}
      </span>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: boolean;
  constructions: string[];
}>();

const emit = defineEmits(['update:modelValue', 'close']);

const { t } = useI18n();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const onClose = () => {
  emit('close');
  emit('update:modelValue', false);
};
</script>

<style lang="scss">
.constructions-dialog {
  .el-dialog__title {
    color: var(--color-primary-text);
    font-weight: 700;
    font-size: 1rem;
  }
}
</style>
