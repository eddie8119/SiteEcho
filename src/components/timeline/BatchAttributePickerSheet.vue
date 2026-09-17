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
        <div class="relative z-10 rounded-t-2xl bg-white px-4 pb-8 pt-4 shadow-xl">
          <!-- Handle -->
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

          <H3Title
            class="mb-4"
            :title="
              type === 'space'
                ? t('sheet.batchAttributePicker.titleSpace')
                : t('sheet.batchAttributePicker.titleConstruction')
            "
          />

          <!-- Options Chips -->
          <div class="mb-4 flex flex-wrap gap-2">
            <button
              v-for="option in options"
              :key="option.id"
              class="rounded-full border px-4 py-1.5 text-sm transition-colors"
              :class="
                isSelected(option.name)
                  ? 'bg-brand-primary text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              "
              @click="toggleOption(option.name)"
            >
              {{ option.name }}
            </button>
          </div>

          <!-- Action buttons -->
          <div class="mb-4 flex justify-between gap-2">
            <!-- Add new option -->
            <button
              v-if="!showAddInput"
              class="rounded-full border border-dashed border-gray-400 px-4 py-1.5 text-sm text-gray-500 hover:border-secondary-purple-a hover:text-secondary-purple-a"
              @click="showAddInput = true"
            >
              {{ t('sheet.batchAttributePicker.addButton') }}
            </button>

            <!-- Manage options button -->
            <button
              class="rounded-full border border-dashed border-gray-400 px-4 py-1.5 text-sm text-gray-500 hover:border-secondary-purple-a hover:text-secondary-purple-a"
              @click="showManageModal = true"
            >
              {{ t('dropdown.self_growing_multi_select.manage_option') }}
            </button>
          </div>

          <!-- Add new input -->
          <div v-if="showAddInput" class="mb-4 flex gap-2">
            <input
              ref="addInputRef"
              v-model="newOptionName"
              type="text"
              :placeholder="
                type === 'space'
                  ? t('sheet.batchAttributePicker.addSpacePlaceholder')
                  : t('sheet.batchAttributePicker.addConstructionPlaceholder')
              "
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-secondary-purple-a focus:outline-none"
              @keyup.enter="confirmAddOption"
            />
            <TextButton variant="primary" size="sm" @click="confirmAddOption">
              {{ t('sheet.batchAttributePicker.confirm') }}
            </TextButton>
            <TrashButton @click="cancelAddOption" />
          </div>

          <!-- Confirm Button -->
          <TextButton
            variant="primary"
            size="md"
            full-width
            :disabled="isConfirmDisabled"
            @click="confirm"
          >
            {{ t('sheet.batchAttributePicker.applyToPhotos', { count }) }}
          </TextButton>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Manage Options Dialog -->
  <ManageOptionsDialog
    v-model="showManageModal"
    :type="type"
    :options="options"
    @edit="openEditDialog"
    @delete="openDeleteDialog"
    @cancel="showManageModal = false"
  />

  <!-- Edit Option Dialog -->
  <EditOptionDialog
    v-model="showEditModal"
    :type="type"
    :item="itemToEdit"
    @submit="(id, name) => $emit('edit-item', id, name)"
    @cancel="showEditModal = false"
  />

  <!-- Delete Option Dialog -->
  <DeleteOptionDialog
    v-model="showDeleteModal"
    :type="type"
    :item="itemToDelete"
    @confirm="(id) => $emit('delete-item', id)"
    @cancel="showDeleteModal = false"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { OptionItem } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import DeleteOptionDialog from '@/components/core/dialog/DeleteOptionDialog.vue';
import EditOptionDialog from '@/components/core/dialog/EditOptionDialog.vue';
import ManageOptionsDialog from '@/components/core/dialog/ManageOptionsDialog.vue';
import H3Title from '@/components/core/title/H3Title.vue';
import TrashButton from '@/components/ui/TrashButton.vue';

const props = defineProps<{
  modelValue: boolean;
  type: 'space' | 'construction';
  options: OptionItem[];
  count: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [name: string | string[]];
  'add-option': [name: string];
  'edit-item': [id: string, name: string];
  'delete-item': [id: string];
}>();

const { t } = useI18n();

const selected = ref<string | string[] | null>(null);

const isSelected = (name: string) => {
  if (props.type === 'space') {
    return selected.value === name;
  }
  return Array.isArray(selected.value) && selected.value.includes(name);
};

const toggleOption = (name: string) => {
  if (props.type === 'space') {
    selected.value = name;
  } else {
    const current = Array.isArray(selected.value) ? [...selected.value] : [];
    const index = current.indexOf(name);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(name);
    }
    selected.value = current;
  }
};

const isConfirmDisabled = computed(() => {
  if (props.type === 'space') {
    return !selected.value;
  }
  return !Array.isArray(selected.value) || selected.value.length === 0;
});
const showAddInput = ref(false);
const newOptionName = ref('');
const addInputRef = ref<HTMLInputElement | null>(null);
const showManageModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const itemToEdit = ref<OptionItem | null>(null);
const itemToDelete = ref<OptionItem | null>(null);

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      selected.value = null;
      showAddInput.value = false;
      newOptionName.value = '';
    } else if (props.type === 'construction') {
      selected.value = [];
    }
  }
);

const confirmAddOption = () => {
  const name = newOptionName.value.trim();
  if (!name) return;
  emit('add-option', name);
  if (props.type === 'space') {
    selected.value = name;
  } else {
    const current = Array.isArray(selected.value) ? [...selected.value] : [];
    if (!current.includes(name)) {
      current.push(name);
    }
    selected.value = current;
  }
  showAddInput.value = false;
  newOptionName.value = '';
};

const cancelAddOption = () => {
  showAddInput.value = false;
  newOptionName.value = '';
};

watch(showAddInput, async (val) => {
  if (val) {
    await nextTick();
    addInputRef.value?.focus();
  }
});

const confirm = () => {
  if (props.type === 'space') {
    if (!selected.value) return;
    emit('confirm', selected.value);
  } else {
    if (!Array.isArray(selected.value) || selected.value.length === 0) return;
    emit('confirm', selected.value);
  }
  emit('update:modelValue', false);
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

<style scoped>
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: all 0.3s ease;
}
.sheet-slide-enter-from .sheet-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
