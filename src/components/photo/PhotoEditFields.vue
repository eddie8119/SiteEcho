<template>
  <div class="flex flex-col gap-4">
    <!-- Pending Status Toggle (hidden when resolved) -->
    <div v-if="!isResolved">
      <button
        type="button"
        class="flex w-full items-center justify-center rounded-lg border-2 px-3 py-2 transition-colors"
        :class="
          isPending
            ? 'border-orange-500 bg-orange-50 hover:bg-orange-100'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        "
        @click="toggleStatus"
      >
        <span
          class="text-sm font-medium"
          :class="isPending ? 'text-brand-primary' : 'text-gray-600'"
        >
          {{ isPending ? t('photo.status.marked_pending') : t('photo.status.mark_pending') }}
        </span>
      </button>
    </div>

    <!-- Pending Type Selection (shown when pending) -->
    <div v-if="isPending && showPendingTypeSelection">
      <LabelText :title="t('photo.label.pending_type')" />
      <div class="mt-2 grid grid-cols-3 gap-2">
        <button
          v-for="(type, index) in pendingTypeOptions"
          :key="index"
          type="button"
          class="flex w-full items-center justify-center rounded-lg border-2 px-3 py-2 text-sm transition-colors"
          :class="
            pendingType === type.value
              ? 'border-orange-500 bg-orange-50 text-brand-primary hover:bg-orange-100'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          "
          @click="handlePendingTypeChange(type.value)"
        >
          <span>{{ type.label }}</span>
        </button>
      </div>
    </div>

    <!-- Resolve Button (shown when pending) -->
    <div v-if="isPending && showPendingTypeSelection" class="flex gap-2">
      <TextButton
        variant="outline"
        size="md"
        full-width
        class="!border-green-500 !bg-green-50 !text-green-700 hover:!bg-green-100"
        @click="handleResolve"
      >
        {{ t('pending.item.resolve') }}
      </TextButton>
      <TextButton
        variant="outline"
        size="md"
        full-width
        class="!border-green-500 !bg-green-50 !text-green-700 hover:!bg-green-100"
        @click="handleResolveWithAfterPhoto"
      >
        {{ t('pending.item.resolve_and_add_after_photo') }}
      </TextButton>
    </div>

    <!-- Construction/Work Type Selection -->
    <div>
      <LabelText :title="t('photo.label.construction_classification')" />
      <SelfGrowingMultiSelect
        v-model="selectedConstructions"
        :options="constructionsOptions"
        type="construction"
        :placeholder="t('photo.placeholder.construction')"
        :filterable="!isMobile"
        @add-item="(name: string) => handleAddItem('construction', name)"
        @edit-item="(id: string, name: string) => handleEditItem('construction', id, name)"
        @delete-item="(id: string) => handleDeleteItem('construction', id)"
      />
    </div>

    <!-- Space Selection (optional) -->
    <div v-if="showSpaceSelection">
      <LabelText :title="t('photo.label.space_location')" />
      <SelfGrowingDropdown
        v-model="selectedSpace"
        :options="spaceOptions"
        type="space"
        :filterable="!isMobile"
        :placeholder="t('photo.placeholder.space')"
        @add-item="(name: string) => handleAddItem('space', name)"
        @edit-item="(id: string, name: string) => handleEditItem('space', id, name)"
        @delete-item="(id: string) => handleDeleteItem('space', id)"
      />
    </div>

    <!-- Note Input -->
    <div>
      <LabelText :title="t('photo.label.note_content')" />
      <textarea
        v-model="note"
        class="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-brand-primary focus:ring-brand-primary"
        :placeholder="t('photo.placeholder.note')"
        rows="4"
        inputmode="text"
        autocorrect="off"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { v4 as uuidv4 } from 'uuid';
import { useField, useForm } from 'vee-validate';
import { computed, ref, type Ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ConstructionOption, SpaceOption } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import SelfGrowingDropdown from '@/components/core/dropdown/SelfGrowingDropdown.vue';
import SelfGrowingMultiSelect from '@/components/core/dropdown/SelfGrowingMultiSelect.vue';
import LabelText from '@/components/core/input/LabelText.vue';
import { useDeviceDetection } from '@/composables/useDeviceDetection';
import { LOCAL_STORAGE_KEYS } from '@/constants/localStorage';
import { DEFAULT_CONSTRUCTION_OPTIONS, DEFAULT_SPACE_OPTIONS } from '@/constants/material';
import { clearConstructionFromPhotos, clearSpaceFromPhotos } from '@/services/photoService';
import { PendingType, PhotoStatus } from '@/types/photo';
import { createPhotoSchema, type CreatePhotoSchema } from '@/utils/schemas/createPhotoSchema';

const props = withDefaults(defineProps<Props>(), {
  showSpaceSelection: true,
  showPendingTypeSelection: true,
  initialStatus: PhotoStatus.NORMAL,
  initialPendingType: null,
  initialConstructions: () => [],
  initialSpace: null,
  initialNote: '',
  initialConstructionsOptions: undefined,
  initialSpaceOptions: undefined,
});

const emit = defineEmits([
  'update:status',
  'update:pendingType',
  'update:constructions',
  'update:space',
  'update:note',
  'resolve-with-after-photo',
]);

const { isMobile } = useDeviceDetection();
const { t } = useI18n();

interface Props {
  showSpaceSelection?: boolean;
  showPendingTypeSelection?: boolean;
  initialStatus?: PhotoStatus;
  initialPendingType?: PendingType | null;
  initialConstructions?: string[];
  initialSpace?: string | null;
  initialNote?: string;
  initialConstructionsOptions?: ConstructionOption[];
  initialSpaceOptions?: SpaceOption[];
}

const constructionsOptions = ref<ConstructionOption[]>([]);
const spaceOptions = ref<SpaceOption[]>([]);

const getInitialValues = (): CreatePhotoSchema => ({
  status: props.initialStatus,
  pendingType: props.initialPendingType || null,
  constructions: props.initialConstructions || [],
  space: props.initialSpace || null,
  note: props.initialNote || '',
});

const { resetForm } = useForm({
  validationSchema: toTypedSchema(createPhotoSchema(t)),
  initialValues: getInitialValues(),
});

const { value: status } = useField<PhotoStatus>('status');
const { value: pendingType } = useField<PendingType | null>('pendingType');
const { value: constructions } = useField<string[]>('constructions');
const { value: space } = useField<string | null>('space');
const { value: note } = useField<string>('note');

const isPending = computed(() => status.value === PhotoStatus.PENDING);
const isResolved = computed(() => status.value === PhotoStatus.RESOLVED);

const pendingTypeOptions = computed(() => [
  { value: PendingType.ISSUE, label: t('tab.pendingPhotos.issue') },
  { value: PendingType.FIX, label: t('tab.pendingPhotos.fix') },
  { value: PendingType.CHECK, label: t('tab.pendingPhotos.check') },
]);

const selectedConstructions = ref<string[]>([]);
const selectedSpace = ref<string | null>(null);

const toggleStatus = () => {
  status.value = isPending.value ? PhotoStatus.NORMAL : PhotoStatus.PENDING;
  if (!isPending.value) {
    pendingType.value = null;
  }
  // Let the watch handlers handle the emits
};

const handlePendingTypeChange = (newPendingType: PendingType | null) => {
  pendingType.value = newPendingType;
  emit('update:pendingType', newPendingType);
};

const handleResolve = () => {
  status.value = PhotoStatus.RESOLVED;
  pendingType.value = null;
};

const handleResolveWithAfterPhoto = () => {
  status.value = PhotoStatus.RESOLVED;
  pendingType.value = null;
  emit('resolve-with-after-photo');
};

// Watch for changes and emit updates
watch(status, (newStatus) => {
  emit('update:status', newStatus);
  if (newStatus === PhotoStatus.NORMAL) {
    emit('update:pendingType', null);
  }
});

watch(pendingType, (newPendingType) => {
  emit('update:pendingType', newPendingType);
});

watch(constructions, (newConstructions) => {
  emit('update:constructions', newConstructions);
});

watch(space, (newSpace) => {
  emit('update:space', newSpace);
});

watch(note, (newNote) => {
  emit('update:note', newNote);
});

// Sync dropdown selections with form fields
watch(selectedConstructions, (newSelectedConstructions) => {
  const constructionNames = newSelectedConstructions
    .map((id) => constructionsOptions.value.find((c) => c.id === id)?.name)
    .filter((name): name is string => !!name);
  constructions.value = constructionNames;
});

watch(selectedSpace, (newSelectedSpace) => {
  const spaceName = newSelectedSpace
    ? spaceOptions.value.find((s) => s.id === newSelectedSpace)?.name || null
    : null;
  space.value = spaceName;
});

// Initialize options from props or localStorage
const initializeOptions = () => {
  if (props.initialConstructionsOptions) {
    constructionsOptions.value = props.initialConstructionsOptions;
  } else {
    const savedConstructions = localStorage.getItem(LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS);
    if (savedConstructions) {
      constructionsOptions.value = JSON.parse(savedConstructions);
    } else {
      constructionsOptions.value = DEFAULT_CONSTRUCTION_OPTIONS;
    }
  }

  if (props.initialSpaceOptions) {
    spaceOptions.value = props.initialSpaceOptions;
  } else {
    const savedSpaces = localStorage.getItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS);
    if (savedSpaces) {
      spaceOptions.value = JSON.parse(savedSpaces);
    } else {
      spaceOptions.value = DEFAULT_SPACE_OPTIONS;
    }
  }
};

// Save options to localStorage
const saveOptions = () => {
  localStorage.setItem(
    LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS,
    JSON.stringify(constructionsOptions.value)
  );
  localStorage.setItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS, JSON.stringify(spaceOptions.value));
};

type DropdownType = 'construction' | 'space';

interface DropdownConfig {
  options: Ref<ConstructionOption[] | SpaceOption[]>;
  selected: Ref<string | string[] | null>;
  clearFromPhotos?: (name: string) => Promise<void>;
}

const dropdownConfig: Record<DropdownType, DropdownConfig> = {
  construction: {
    options: constructionsOptions,
    selected: selectedConstructions as Ref<string[]>,
    clearFromPhotos: clearConstructionFromPhotos,
  },
  space: {
    options: spaceOptions,
    selected: selectedSpace,
    clearFromPhotos: clearSpaceFromPhotos,
  },
};

const handleAddItem = (type: DropdownType, name: string) => {
  const config = dropdownConfig[type];
  const newItem = {
    id: uuidv4(),
    name,
    type,
  };

  (config.options.value as Array<ConstructionOption | SpaceOption>).push(newItem);
  if (Array.isArray(config.selected.value)) {
    config.selected.value.push(newItem.id);
  } else {
    config.selected.value = newItem.id;
  }
  saveOptions();
};

const handleEditItem = (type: DropdownType, id: string, name: string) => {
  const config = dropdownConfig[type];
  const item = config.options.value.find((o) => o.id === id);
  if (item) {
    item.name = name;
    saveOptions();
  }
};

const handleDeleteItem = async (type: DropdownType, id: string) => {
  const config = dropdownConfig[type];

  const item = config.options.value.find((o) => o.id === id);
  if (!item) return;

  try {
    await config.clearFromPhotos?.(item.name);

    config.options.value = config.options.value.filter((o) => o.id !== id) as
      | ConstructionOption[]
      | SpaceOption[];

    if (Array.isArray(config.selected.value)) {
      config.selected.value = config.selected.value.filter((v) => v !== id);
    } else if (config.selected.value === id) {
      config.selected.value = null;
    }
    saveOptions();
  } catch (error) {
    console.error(`Error deleting ${type}:`, error);
  }
};

// Initialize initial values
const initializeValues = () => {
  status.value = props.initialStatus;
  pendingType.value = props.initialPendingType || null;
  note.value = props.initialNote || '';

  // Find matching constructions and space by name for dropdown components
  const constructionObjs = (props.initialConstructions || []).map((name) =>
    constructionsOptions.value.find((c) => c.name === name)
  );
  const spaceObj = spaceOptions.value.find((s) => s.name === props.initialSpace);

  selectedConstructions.value = constructionObjs
    .filter((c): c is ConstructionOption => !!c)
    .map((c) => c.id);
  selectedSpace.value = spaceObj?.id || null;
  // Let the watches update constructions.value and space.value
};

// Initialize synchronously to ensure options are available for child components
initializeOptions();
initializeValues();

// Watch for prop changes
watch(
  () => props.initialConstructions,
  (newConstructions) => {
    const constructionObjs = (newConstructions || []).map((name) =>
      constructionsOptions.value.find((c) => c.name === name)
    );
    selectedConstructions.value = constructionObjs
      .filter((c): c is ConstructionOption => !!c)
      .map((c) => c.id);
    // Let the selectedConstructions watch update constructions.value
  }
);

watch(
  () => props.initialSpace,
  (newSpace) => {
    const spaceObj = spaceOptions.value.find((s) => s.name === newSpace);
    selectedSpace.value = spaceObj?.id || null;
    // Let the selectedSpace watch update space.value
  }
);

watch(
  () => props.initialStatus,
  (newStatus) => {
    status.value = newStatus;
  }
);

watch(
  () => props.initialPendingType,
  (newPendingType) => {
    pendingType.value = newPendingType || null;
  }
);

watch(
  () => props.initialNote,
  (newNote) => {
    note.value = newNote || '';
  }
);

// Expose methods to parent
defineExpose({
  getFormData: () => ({
    constructions: constructions.value,
    space: space.value,
    status: status.value,
    pendingType: pendingType.value,
    note: note.value,
  }),
  resetForm: () => {
    selectedConstructions.value = [];
    selectedSpace.value = null;
    // Let the watches update form fields, then reset vee-validate
    resetForm({ values: getInitialValues() });
  },
});
</script>

<style scoped lang="scss">
textarea {
  resize: vertical;
}
</style>
