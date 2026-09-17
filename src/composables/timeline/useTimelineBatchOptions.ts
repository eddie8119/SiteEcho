import { v4 as uuidv4 } from 'uuid';
import { ref, type Ref } from 'vue';

import type { ConstructionOption, SpaceOption } from '@/types/photo';

import { LOCAL_STORAGE_KEYS } from '@/constants/localStorage';
import { DEFAULT_CONSTRUCTION_OPTIONS, DEFAULT_SPACE_OPTIONS } from '@/constants/material';
import { clearConstructionFromPhotos, clearSpaceFromPhotos } from '@/services/photoService';

interface useTimelineBatchOptionsParams {
  selectedPhotos: Ref<Set<string>>;
  clearSelection: () => void;
  batchSetSpace: (name: string) => Promise<void>;
  batchSetConstruction: (name: string | string[]) => Promise<void>;
}

export const useTimelineBatchOptions = ({
  selectedPhotos,
  clearSelection,
  batchSetSpace,
  batchSetConstruction,
}: useTimelineBatchOptionsParams) => {
  const showSpacePicker = ref(false);
  const showConstructionPicker = ref(false);
  const toastMessage = ref('');

  const spaceOptions = ref<SpaceOption[]>([]);
  const constructionOptions = ref<ConstructionOption[]>([]);

  const loadOptions = () => {
    const savedSpaces = localStorage.getItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS);
    const savedConstructions = localStorage.getItem(LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS);
    spaceOptions.value = savedSpaces ? JSON.parse(savedSpaces) : DEFAULT_SPACE_OPTIONS;
    constructionOptions.value = savedConstructions
      ? JSON.parse(savedConstructions)
      : DEFAULT_CONSTRUCTION_OPTIONS;
  };

  const handleBatchSetSpace = async (name: string) => {
    const count = selectedPhotos.value.size;
    await batchSetSpace(name);
    toastMessage.value = `已套用到 ${count} 張照片`;
    clearSelection();
  };

  const handleBatchSetConstruction = async (name: string | string[]) => {
    const count = selectedPhotos.value.size;
    await batchSetConstruction(name);
    toastMessage.value = `已套用到 ${count} 張照片`;
    clearSelection();
  };

  const handleAddSpaceOption = (name: string) => {
    const newOption: SpaceOption = { id: uuidv4(), name, type: 'space' };
    spaceOptions.value.push(newOption);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS, JSON.stringify(spaceOptions.value));
  };

  const handleAddConstructionOption = (name: string) => {
    const newOption: ConstructionOption = { id: uuidv4(), name, type: 'construction' };
    constructionOptions.value.push(newOption);
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS,
      JSON.stringify(constructionOptions.value)
    );
  };

  const handleEditSpaceOption = (id: string, name: string) => {
    const option = spaceOptions.value.find((o) => o.id === id);
    if (option) {
      option.name = name;
      localStorage.setItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS, JSON.stringify(spaceOptions.value));
    }
  };

  const handleDeleteSpaceOption = async (id: string) => {
    const option = spaceOptions.value.find((o) => o.id === id);
    if (!option) return;

    try {
      await clearSpaceFromPhotos(option.name);
      spaceOptions.value = spaceOptions.value.filter((o) => o.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS, JSON.stringify(spaceOptions.value));
    } catch (error) {
      console.error('Error deleting space:', error);
    }
  };

  const handleEditConstructionOption = (id: string, name: string) => {
    const option = constructionOptions.value.find((o) => o.id === id);
    if (option) {
      option.name = name;
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS,
        JSON.stringify(constructionOptions.value)
      );
    }
  };

  const handleDeleteConstructionOption = async (id: string) => {
    const option = constructionOptions.value.find((o) => o.id === id);
    if (!option) return;

    try {
      await clearConstructionFromPhotos(option.name);
      constructionOptions.value = constructionOptions.value.filter((o) => o.id !== id);
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS,
        JSON.stringify(constructionOptions.value)
      );
    } catch (error) {
      console.error('Error deleting construction:', error);
    }
  };

  return {
    showSpacePicker,
    showConstructionPicker,
    toastMessage,
    spaceOptions,
    constructionOptions,
    loadOptions,
    handleBatchSetSpace,
    handleBatchSetConstruction,
    handleAddSpaceOption,
    handleAddConstructionOption,
    handleEditSpaceOption,
    handleDeleteSpaceOption,
    handleEditConstructionOption,
    handleDeleteConstructionOption,
  };
};
