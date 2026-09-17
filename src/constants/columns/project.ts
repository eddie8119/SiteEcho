import type { Column } from '@/types/common';

export const PROJECT_TODO_COLUMNS: Column[] = [
  { field: 'index' },
  { field: 'title' },
  { field: 'type' },
  { field: 'task_done_progress', minWidth: 100 },
  { field: 'task_todo_left', align: 'right' },
  { field: 'total_planning_amount', align: 'right', minWidth: 100 },
  { field: 'total_usage_amount', align: 'right', minWidth: 100 },
  { field: 'floor_plan_urls', align: 'center' },
  { field: 'created_at', align: 'center' },
  { field: 'download_excel' },
  { field: 'collaborators' },
  { field: 'owner' },
];

export const PROJECT_PLANNING_COLUMNS: Column[] = [
  { field: 'index' },
  { field: 'title' },
  { field: 'type' },
  { field: 'construction_planning_period', minWidth: 100 },
  { field: 'total_planning_amount', align: 'right', minWidth: 100 },
  { field: 'created_at', align: 'center' },
  { field: 'owner' },
];
