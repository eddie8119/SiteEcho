<template>
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
        <div class="relative z-10 rounded-t-2xl bg-white px-4 pb-8 pt-4 shadow-xl">
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

          <H3Title class="mb-2" :title="t('photo.import_photo', { count: photoCount })" />

          <div class="mt-4 space-y-6">
            <!-- Space Selection -->
            <div>
              <LabelText :title="t('photo.label.space_location')" />
              <SelfGrowingDropdown
                v-model="selectedSpace"
                :options="localSpaceOptions"
                type="space"
                :placeholder="t('photo.placeholder.space')"
                :filterable="!isMobile"
                @add-item="handleAddSpaceItem"
                @edit-item="handleEditSpaceItem"
                @delete-item="handleDeleteSpaceItem"
              />
            </div>

            <!-- Construction Selection -->
            <div>
              <LabelText :title="t('photo.label.construction_classification')" />
              <SelfGrowingMultiSelect
                v-model="selectedConstructions"
                :options="localConstructionOptions"
                type="construction"
                :filterable="!isMobile"
                :placeholder="t('photo.placeholder.construction')"
                @add-item="handleAddConstructionItem"
                @edit-item="handleEditConstructionItem"
                @delete-item="handleDeleteConstructionItem"
              />
            </div>

            <!-- Pending Toggle -->
            <button
              type="button"
              class="flex w-full items-center justify-center rounded-lg border-2 px-3 py-2 transition-colors"
              :class="
                settings.isPending
                  ? 'border-orange-500 bg-orange-50 hover:bg-orange-100'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              "
              @click="settings.isPending = !settings.isPending"
            >
              <span
                class="text-sm font-medium"
                :class="settings.isPending ? 'text-orange-700' : 'text-gray-600'"
              >
                {{
                  settings.isPending
                    ? t('photo.status.marked_pending')
                    : t('photo.status.mark_pending')
                }}
              </span>
            </button>

            <!-- Confirm Button -->
            <TextButton variant="primary" size="md" full-width @click="confirm">
              {{ t('button.import') }}
            </TextButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ImportSettings } from '@/composables/usePhotoImport';
import type { ConstructionOption, SpaceOption } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import SelfGrowingDropdown from '@/components/core/dropdown/SelfGrowingDropdown.vue';
import SelfGrowingMultiSelect from '@/components/core/dropdown/SelfGrowingMultiSelect.vue';
import LabelText from '@/components/core/input/LabelText.vue';
import H3Title from '@/components/core/title/H3Title.vue';
import { useDeviceDetection } from '@/composables/useDeviceDetection';

const props = defineProps<{
  modelValue: boolean;
  photoCount: number;
  spaceOptions: SpaceOption[];
  constructionOptions: ConstructionOption[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [settings: ImportSettings];
  'add-space': [name: string];
  'add-construction': [name: string];
  'edit-space': [id: string, name: string];
  'edit-construction': [id: string, name: string];
  'delete-space': [id: string];
  'delete-construction': [id: string];
  'update-space-options': [options: SpaceOption[]];
  'update-construction-options': [options: ConstructionOption[]];
}>();

const { isMobile } = useDeviceDetection();
const { t } = useI18n();

const settings = reactive<ImportSettings>({
  space: null,
  constructions: [],
  isPending: false,
});

const selectedSpace = ref<string | null>(null);
const selectedConstructions = ref<string[]>([]);

// Local copies of options for editing
const localSpaceOptions = ref<SpaceOption[]>([]);
const localConstructionOptions = ref<ConstructionOption[]>([]);

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      settings.space = null;
      settings.constructions = [];
      settings.isPending = false;
      selectedSpace.value = null;
      selectedConstructions.value = [];
      // Initialize local options from props
      localSpaceOptions.value = [...props.spaceOptions];
      localConstructionOptions.value = [...props.constructionOptions];
    }
  },
  { immediate: true }
);

// Watch selected values to update settings
watch(selectedSpace, (newVal) => {
  const spaceObj = localSpaceOptions.value.find((s) => s.id === newVal);
  settings.space = spaceObj?.name || null;
});

watch(selectedConstructions, (newVal) => {
  const constructionObjs = localConstructionOptions.value.filter((c) => newVal.includes(c.id));
  settings.constructions = constructionObjs.map((c) => c.name);
});

// Dropdown handlers for Space

const handleAddSpaceItem = (name: string) => {
  const newItem = {
    id: uuidv4(),
    name,
    type: 'space' as const,
  };
  localSpaceOptions.value.push(newItem);
  selectedSpace.value = newItem.id;
  emit('add-space', name);
  emit('update-space-options', [...localSpaceOptions.value]);
};

const handleEditSpaceItem = (id: string, name: string) => {
  const item = localSpaceOptions.value.find((o) => o.id === id);
  if (item) {
    item.name = name;
    emit('edit-space', id, name);
    emit('update-space-options', [...localSpaceOptions.value]);
  }
};

const handleDeleteSpaceItem = (id: string) => {
  localSpaceOptions.value = localSpaceOptions.value.filter((o) => o.id !== id);
  if (selectedSpace.value === id) {
    selectedSpace.value = null;
  }
  emit('delete-space', id);
  emit('update-space-options', [...localSpaceOptions.value]);
};

// Dropdown handlers for Construction
const handleAddConstructionItem = (name: string) => {
  const newItem = {
    id: uuidv4(),
    name,
    type: 'construction' as const,
  };
  localConstructionOptions.value.push(newItem);
  selectedConstructions.value.push(newItem.id);
  emit('add-construction', name);
  emit('update-construction-options', [...localConstructionOptions.value]);
};

const handleEditConstructionItem = (id: string, name: string) => {
  const item = localConstructionOptions.value.find((o) => o.id === id);
  if (item) {
    item.name = name;
    emit('edit-construction', id, name);
    emit('update-construction-options', [...localConstructionOptions.value]);
  }
};

const handleDeleteConstructionItem = (id: string) => {
  localConstructionOptions.value = localConstructionOptions.value.filter((o) => o.id !== id);
  selectedConstructions.value = selectedConstructions.value.filter((v) => v !== id);
  emit('delete-construction', id);
  emit('update-construction-options', [...localConstructionOptions.value]);
};

const confirm = () => {
  emit('confirm', { ...settings });
  emit('update:modelValue', false);
};
</script>

<style scoped>
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: all 0.3s ease;
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
