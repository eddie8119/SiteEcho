import { inject, provide, ref, type Ref } from 'vue';

import { type TaskCardDisplayMode } from '@/constants/selection';

interface TaskCardFilterContext {
  displayMode: Ref<TaskCardDisplayMode>;
  showDescription: Ref<boolean>;
  updateVisibility: (mode: TaskCardDisplayMode) => void;
}

const TASK_CARD_FILTER_KEY = Symbol('taskCardFilter');

export const provideTaskCardFilter = () => {
  const displayMode = ref<TaskCardDisplayMode>('all');
  const showDescription = ref(true);

  // Watch displayMode and update visibility flags
  const updateVisibility = (mode: TaskCardDisplayMode) => {
    switch (mode) {
      case 'content':
        showDescription.value = true;
        break;
      case 'all':
      default:
        showDescription.value = true;
        break;
    }
  };

  // Initialize
  updateVisibility(displayMode.value);

  // Provide context
  const context: TaskCardFilterContext = {
    displayMode,
    showDescription,
    updateVisibility,
  };

  provide(TASK_CARD_FILTER_KEY, context);

  return {
    displayMode,
    showDescription,
    updateVisibility,
  };
};

export const useTaskCardFilterContext = (): TaskCardFilterContext => {
  const context = inject<TaskCardFilterContext>(TASK_CARD_FILTER_KEY);

  if (!context) {
    throw new Error(
      'useTaskCardFilterContext must be used within a component that calls provideTaskCardFilter'
    );
  }

  return context;
};
