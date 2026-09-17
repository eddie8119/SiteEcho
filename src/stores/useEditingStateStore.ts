import { defineStore } from 'pinia';
import { ref } from 'vue';

export type EditingComponentType = 'container' | 'task' | 'none';

export interface EditingState {
  type: EditingComponentType;
  id: string | null;
}

/**
 * Store to manage editing states across components
 * Ensures only one component can be in editing mode at a time
 */
export const useEditingStateStore = defineStore('editingState', () => {
  // Current editing state
  const currentEditingState = ref<EditingState>({ type: 'none', id: null });

  /**
   * Start editing a component
   * @param type Type of component being edited ('container' or 'task')
   * @param id ID of the component (can be container ID or task ID)
   */
  function startEditing(type: EditingComponentType, id: string | number): void {
    // Convert id to string for consistency
    const stringId = String(id);

    // If already editing this component, do nothing
    if (currentEditingState.value.type === type && currentEditingState.value.id === stringId) {
      return;
    }
    // Update to new editing state
    currentEditingState.value = { type, id: stringId };
  }

  /**
   * Stop editing the current component
   */
  function stopEditing(): void {
    currentEditingState.value = { type: 'none', id: null };
  }

  /**
   * Check if a specific component is currently being edited
   * @param type Type of component to check
   * @param id ID of the component to check
   * @returns boolean indicating if the component is being edited
   */
  function isEditing(type: EditingComponentType, id: string | number): boolean {
    // Convert id to string for consistent comparison
    const stringId = String(id);
    return currentEditingState.value.type === type && currentEditingState.value.id === stringId;
  }

  /**
   * Check if any component is currently being edited
   * @returns boolean indicating if any component is being edited
   */
  function isAnyEditing(): boolean {
    return currentEditingState.value.type !== 'none';
  }

  /**
   * Check if a different component type is currently being edited
   * @param type Type of component to check against
   * @returns boolean indicating if a different component type is being edited
   */
  function isOtherTypeEditing(type: EditingComponentType): boolean {
    return currentEditingState.value.type !== 'none' && currentEditingState.value.type !== type;
  }

  return {
    currentEditingState,
    startEditing,
    stopEditing,
    isEditing,
    isAnyEditing,
    isOtherTypeEditing,
  };
});
