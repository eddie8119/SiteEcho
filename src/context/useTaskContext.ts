import { inject, type InjectionKey, provide } from 'vue';

import type { TaskResponse } from '@/types/response';

// Define the type for our task context
interface TaskContext {
  deleteTask: (taskId: string) => void;
  addNewTask: (newTaskData: TaskResponse) => void;
  updateTask: (taskId: string, updatedTask: Partial<TaskResponse>) => void;
}

// Create a symbol as injection key
const TaskContextKey = Symbol('TaskContext') as InjectionKey<TaskContext>;

/**
 * Provider function to be used in the parent component (KanbanBoard)
 */
export function provideTaskContext(context: TaskContext) {
  provide(TaskContextKey, context);
}

/**
 * Consumer function to be used in any child component that needs task operations
 */
export function useTaskContext(): TaskContext {
  const context = inject(TaskContextKey);

  if (!context) {
    throw new Error('useTaskContext must be used within a component that has TaskContext provided');
  }

  return context;
}
