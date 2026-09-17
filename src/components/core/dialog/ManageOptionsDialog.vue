<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="title"
    :show-footer-button="false"
    @cancel="onCancel"
  >
    <div class="max-h-96 overflow-y-auto">
      <div
        v-for="option in options"
        :key="option.id"
        class="flex items-center justify-between border-b border-gray-100 py-3"
      >
        <span class="text-base">{{ option.name }}</span>
        <div class="flex gap-2">
          <button class="rounded-full p-1 hover:bg-orange-300" @click="onEdit(option)">
            <EditIcon size="h-5 w-5" />
          </button>
          <TrashButton @click="onDelete(option)" />
        </div>
      </div>
    </div>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { OptionItem } from '@/types/photo';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import EditIcon from '@/components/ui/EditIcon.vue';
import TrashButton from '@/components/ui/TrashButton.vue';

const props = defineProps<{
  modelValue: boolean;
  type: 'construction' | 'space';
  options: OptionItem[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  edit: [option: OptionItem];
  delete: [option: OptionItem];
  cancel: [];
}>();

const { t } = useI18n();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const typeLabel = computed(() =>
  props.type === 'construction'
    ? t('dialog.option_dialog.construction')
    : t('dialog.option_dialog.space')
);
const title = computed(() => t('dialog.option_dialog.manage_title', { type: typeLabel.value }));

const onEdit = (option: OptionItem) => {
  emit('edit', option);
};

const onDelete = (option: OptionItem) => {
  emit('delete', option);
};

const onCancel = () => {
  emit('cancel');
  dialogVisible.value = false;
};
</script>
