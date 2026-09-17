import { computed, ref, type Ref, watch } from 'vue';

import type { TaskResponse } from '@/types/response';
import type { ConstructionSelection } from '@/types/selection';

export function useConstructionFilter(constructionContainer: Ref<ConstructionSelection[] | null>) {
  const selectedConstructionIds = ref<string[]>([]);
  const hasInitializedConstructions = ref(false);

  // Initialize and keep selections in sync with container changes
  watch(
    () => constructionContainer.value,
    (list) => {
      const ids = (list ?? []).map((c) => c.id);
      if (!hasInitializedConstructions.value) {
        selectedConstructionIds.value = ids;
        hasInitializedConstructions.value = true;
        return;
      }
      const existing = selectedConstructionIds.value.filter((id) => ids.includes(id));
      const newIds = ids.filter((id) => !existing.includes(id));
      selectedConstructionIds.value = [...existing, ...newIds];
    },
    { immediate: true }
  );

  const toggleConstruction = (id: string) => {
    const idx = selectedConstructionIds.value.indexOf(id);
    if (idx >= 0) selectedConstructionIds.value.splice(idx, 1);
    else selectedConstructionIds.value.push(id);
  };

  const restoreConstructionSelections = () => {
    selectedConstructionIds.value = (constructionContainer.value ?? []).map((c) => c.id);
  };

  const clearConstructionSelections = () => {
    selectedConstructionIds.value = [];
  };

  const isAllSelected = computed(() => {
    const allIds = (constructionContainer.value ?? []).map((c) => c.id);
    return allIds.length > 0 && selectedConstructionIds.value.length === allIds.length;
  });

  return {
    selectedConstructionIds,
    toggleConstruction,
    restoreConstructionSelections,
    clearConstructionSelections,
    isAllSelected,
  };
}

export function filterTasksBySelectedConstructions(
  tasks: TaskResponse[],
  selectedConstructionIds: Ref<string[]>,
  constructionContainer: Ref<ConstructionSelection[] | null>
) {
  const allConstructionIds = (constructionContainer.value ?? []).map((c) => c.id);

  // If there are constructions defined but none are selected, show nothing
  if (allConstructionIds.length > 0 && selectedConstructionIds.value.length === 0) {
    return [] as TaskResponse[];
  }

  const isAllSelected =
    allConstructionIds.length > 0 &&
    selectedConstructionIds.value.length === allConstructionIds.length;

  if (isAllSelected) return tasks; // no filtering when all selected

  // Build a tolerant set that includes both ids and names for selected constructions
  const selectedMeta = (constructionContainer.value ?? []).filter((c) =>
    selectedConstructionIds.value.includes(c.id)
  );
  const selectedSet = new Set<string>([
    ...selectedMeta.map((c) => c.id),
    ...selectedMeta.map((c) => c.name),
  ]);

  return tasks.filter((task) => {
    const type = task.constructionType ?? '';
    return selectedSet.has(type);
  });
}
