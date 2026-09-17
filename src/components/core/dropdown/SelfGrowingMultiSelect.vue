<template>
  <div class="relative">
    <ElSelect
      v-model="selectedValues"
      multiple
      :filterable="isFilterable"
      allow-create
      default-first-option
      :reserve-keyword="false"
      :placeholder="placeholder"
      value-key="id"
      @change="handleChange"
    >
      <ElOption :value="newItem" class="flex items-center gap-2">
        <ElInput
          v-model="newItem"
          :placeholder="t('dropdown.self_growing_multi_select.add_placeholder')"
          size="small"
          :readonly="true"
          @focus="handleInputFocus"
          @keyup.enter="handleAddNew"
          @click.stop
        >
          <template #append>
            <ElButton size="small" @click.stop="handleAddNew">+</ElButton>
          </template>
        </ElInput>
      </ElOption>
      <ElOption value="__MANAGE__" :label="t('dropdown.self_growing_multi_select.manage_option')" />
      <ElOption v-for="option in options" :key="option.id" :label="option.name" :value="option" />
    </ElSelect>

    <AddOptionDialog
      v-model="showAddModal"
      :type="type"
      @submit="(name) => $emit('add-item', name)"
      @cancel="showAddModal = false"
    />

    <ManageOptionsDialog
      v-model="showManageModal"
      :type="type"
      :options="options"
      @edit="openEditDialog"
      @delete="openDeleteDialog"
      @cancel="showManageModal = false"
    />

    <EditOptionDialog
      v-model="showEditModal"
      :type="type"
      :item="itemToEdit"
      @submit="(id, name) => $emit('edit-item', id, name)"
      @cancel="showEditModal = false"
    />

    <DeleteOptionDialog
      v-model="showDeleteModal"
      :type="type"
      :item="itemToDelete"
      @confirm="(id) => $emit('delete-item', id)"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ElButton, ElInput, ElOption, ElSelect } from 'element-plus';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { OptionItem } from '@/types/photo';

import AddOptionDialog from '@/components/core/dialog/AddOptionDialog.vue';
import DeleteOptionDialog from '@/components/core/dialog/DeleteOptionDialog.vue';
import EditOptionDialog from '@/components/core/dialog/EditOptionDialog.vue';
import ManageOptionsDialog from '@/components/core/dialog/ManageOptionsDialog.vue';
import { isMobile } from '@/utils/device';

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    options: OptionItem[];
    type: 'construction' | 'space';
    placeholder: string;
    filterable?: boolean;
  }>(),
  {
    filterable: true,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'add-item': [name: string];
  'edit-item': [id: string, name: string];
  'delete-item': [id: string];
}>();

const { t } = useI18n();

const isFilterable = computed(() => {
  return props.filterable && !isMobile();
});

const newItem = ref<string>('');
const showAddModal = ref(false);
const showManageModal = ref(false);
const showDeleteModal = ref(false);
const showEditModal = ref(false);
const itemToDelete = ref<OptionItem | null>(null);
const itemToEdit = ref<OptionItem | null>(null);

const selectedValues = computed({
  get: () => {
    return props.modelValue
      .map((id) => props.options.find((o) => o.id === id))
      .filter((o): o is OptionItem => !!o);
  },
  set: (value) => {
    const ids = value.map((v) => {
      if (typeof v === 'string') {
        return v;
      }
      return v.id;
    });
    emit('update:modelValue', ids);
  },
});

const handleChange = (value: (OptionItem | string)[]) => {
  const hasManage = value.some((v) => v === '__MANAGE__');
  if (hasManage) {
    showManageModal.value = true;
    // Remove the __MANAGE__ option from the selection
    const filteredValue = value.filter((v) => v !== '__MANAGE__');
    emit(
      'update:modelValue',
      filteredValue.map((v) => (typeof v === 'string' ? v : v.id))
    );
  }
};

const handleAddNew = () => {
  if (newItem.value.trim()) {
    emit('add-item', newItem.value.trim());
    newItem.value = '';
  }
};

const handleInputFocus = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement;
  target.removeAttribute('readonly');
};

const openEditDialog = (option: OptionItem) => {
  itemToEdit.value = option;
  showEditModal.value = true;
};

const openDeleteDialog = (option: OptionItem) => {
  itemToDelete.value = option;
  showDeleteModal.value = true;
};
</script>
