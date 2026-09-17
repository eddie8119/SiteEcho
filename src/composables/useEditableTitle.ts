import { computed, ref, watch } from 'vue';

import { useEditingStateStore } from '@/stores/useEditingStateStore';

/**
 * 可編輯標題的共用邏輯
 * @param props 組件屬性，包含標題
 * @param emit 事件發射器
 * @param titlePropName 標題屬性名稱，默認為 'title'
 * @param idPropName ID 屬性名稱，默認為 'id'
 * @param emitName 自定義事件名稱，默認為 `update:${titlePropName}`
 */
export function useEditableTitle(
  props: Record<string, unknown>,
  emit: (event: string, ...args: unknown[]) => void,
  titlePropName = 'title',
  idPropName = 'id',
  emitName?: string
) {
  const editingStateStore = useEditingStateStore();

  const isEditingTitle = ref(false);
  const tempTitle = ref(props[titlePropName] || '');
  const titleInputRef = ref<HTMLInputElement | null>(null);

  // 計算屬性：確保 title 有值
  const title = computed(() => props[titlePropName] || '');

  // Watch for changes in the global editing state
  watch(
    () => editingStateStore.currentEditingState,
    (newState) => {
      // If this component is in edit mode, but the global state has changed to another component,
      // cancel the edit for this component.
      const componentId = String(props[idPropName] ?? '');
      if (isEditingTitle.value && (newState.type !== 'container' || newState.id !== componentId)) {
        cancelEdit();
      }
    },
    { deep: true }
  );

  // 開始編輯模式
  const startEditing = async () => {
    const componentId = props[idPropName];
    if (componentId === undefined || componentId === null) {
      console.warn(
        `useEditableTitle requires "${idPropName}" prop to identify editing state. Received:`,
        componentId
      );
      return;
    }
    editingStateStore.startEditing('container', String(componentId));
    isEditingTitle.value = true;
    tempTitle.value = props[titlePropName] || '';

    // 等待 DOM 更新後聚焦並選中文字
    setTimeout(() => {
      if (titleInputRef.value) {
        titleInputRef.value.focus();
        titleInputRef.value.select();
      }
    }, 0);
  };

  // 輸入框聚焦時選中全部文字
  const onInputFocus = (event: FocusEvent) => {
    const input = event.target as HTMLInputElement;
    input?.select();
  };

  // 儲存標題
  const saveTitle = () => {
    const currentValue = tempTitle.value;
    const trimmedTitle = typeof currentValue === 'string' ? currentValue.trim() : '';

    // 如果標題為空，恢復原標題
    if (!trimmedTitle) {
      tempTitle.value = String(props[titlePropName] || '');
    }

    isEditingTitle.value = false;

    // 只有當標題真的改變時才發送事件
    if (trimmedTitle && trimmedTitle !== props[titlePropName]) {
      const eventName = emitName || `update:${titlePropName}`;
      emit(eventName, trimmedTitle);
    }
  };

  // 取消編輯
  const cancelEdit = () => {
    tempTitle.value = String(props[titlePropName] || '');
    isEditingTitle.value = false;
  };

  // 監聽 props 變化
  watch(
    () => props[titlePropName],
    (newTitle: unknown) => {
      if (!isEditingTitle.value) {
        tempTitle.value = String(newTitle || '');
      }
    }
  );

  return {
    isEditingTitle,
    tempTitle,
    titleInputRef,
    title,
    startEditing,
    onInputFocus,
    saveTitle,
    cancelEdit,
  };
}
