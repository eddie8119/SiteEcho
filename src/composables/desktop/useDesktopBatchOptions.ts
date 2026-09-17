import { type ComputedRef, ref } from 'vue';

import type { PhotoUpdatePayload } from '@/api/photo';
import type { ConstructionOption, PhotoRecord, SpaceOption } from '@/types/photo';

import { LOCAL_STORAGE_KEYS } from '@/constants/localStorage';
import { DEFAULT_CONSTRUCTION_OPTIONS, DEFAULT_SPACE_OPTIONS } from '@/constants/material';
import { clearConstructionFromPhotos, clearSpaceFromPhotos } from '@/services/photoService';

interface UseDesktopBatchOptionsParams {
  selectedPhotos: ComputedRef<PhotoRecord[]>;
  deselectAllPhotos: () => void;
  toggleMultiSelectMode: () => void;
  updatePhoto: (id: string, payload: PhotoUpdatePayload) => Promise<unknown>;
}

export const useDesktopBatchOptions = ({
  selectedPhotos,
  deselectAllPhotos,
  toggleMultiSelectMode,
  updatePhoto,
}: UseDesktopBatchOptionsParams) => {
  const showSpacePicker = ref(false);
  const showConstructionPicker = ref(false);

  const spaceOptions = ref<SpaceOption[]>([]);
  const constructionOptions = ref<ConstructionOption[]>([]);

  const initializeOptions = () => {
    const savedSpaces = localStorage.getItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS);
    spaceOptions.value = savedSpaces ? JSON.parse(savedSpaces) : DEFAULT_SPACE_OPTIONS;

    const savedConstructions = localStorage.getItem(LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS);
    constructionOptions.value = savedConstructions
      ? JSON.parse(savedConstructions)
      : DEFAULT_CONSTRUCTION_OPTIONS;
  };

  const handleBatchSetSpace = () => {
    showSpacePicker.value = true;
  };

  const handleBatchSetConstruction = () => {
    showConstructionPicker.value = true;
  };

  const handleBatchSpaceConfirm = async (name: string | string[]) => {
    if (typeof name !== 'string') return;
    for (const photo of selectedPhotos.value) {
      await updatePhoto(photo.serverId || photo.id, {
        space: name,
        parentPhotoId: photo.parentPhotoId,
        relatedPhotoIds: photo.relatedPhotoIds,
      });
    }
    deselectAllPhotos();
    toggleMultiSelectMode();
  };

  const handleBatchConstructionConfirm = async (names: string | string[]) => {
    const newConstructions = Array.isArray(names) ? names : [names];
    for (const photo of selectedPhotos.value) {
      const existingConstructions = photo.constructions || [];
      const mergedConstructions = [...new Set([...existingConstructions, ...newConstructions])];
      await updatePhoto(photo.serverId || photo.id, {
        constructions: mergedConstructions,
        parentPhotoId: photo.parentPhotoId,
        relatedPhotoIds: photo.relatedPhotoIds,
      });
    }
    deselectAllPhotos();
    toggleMultiSelectMode();
  };

  const handleAddSpaceOption = (name: string) => {
    const newOption: SpaceOption = { id: crypto.randomUUID(), name, type: 'space' };
    spaceOptions.value.push(newOption);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS, JSON.stringify(spaceOptions.value));
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

  const handleAddConstructionOption = (name: string) => {
    const newOption: ConstructionOption = {
      id: crypto.randomUUID(),
      name,
      type: 'construction',
    };
    constructionOptions.value.push(newOption);
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS,
      JSON.stringify(constructionOptions.value)
    );
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
    spaceOptions,
    constructionOptions,
    initializeOptions,
    handleBatchSetSpace,
    handleBatchSetConstruction,
    handleBatchSpaceConfirm,
    handleBatchConstructionConfirm,
    handleAddSpaceOption,
    handleEditSpaceOption,
    handleDeleteSpaceOption,
    handleAddConstructionOption,
    handleEditConstructionOption,
    handleDeleteConstructionOption,
  };
};
