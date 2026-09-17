/**
 * 用於管理TABLE 開啟對話框 和編輯操作。
 *
 */

import { ref, type Ref } from 'vue';

interface UseDialogReturn<T> {
  showEditDialog: Ref<boolean>;
  selectedObject: Ref<T | null>;
  editObject: (object: T) => void;
  closeDialog: () => void;
}

export function useDialog<T extends object>(): UseDialogReturn<T> {
  const showEditDialog = ref<boolean>(false);
  const selectedObject = ref<T | null>(null) as Ref<T | null>;

  const editObject = (object: T): void => {
    showEditDialog.value = true;
    selectedObject.value = { ...object } as T;
  };

  const closeDialog = (): void => {
    selectedObject.value = null;
    showEditDialog.value = false;
  };

  return {
    showEditDialog,
    selectedObject,
    editObject,
    closeDialog,
  };
}
