export type TodoFilterType = 'all' | 'done' | 'todo';

export interface TodoItemDraft {
  id: string;
  content: string;
  completed: boolean;
  isMoved: boolean;
}
