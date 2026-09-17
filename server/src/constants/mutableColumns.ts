import type { ProjectSnakeBody } from '@/types/requestBody';

// project
export const PROJECT_MUTABLE_COLUMNS = [
  'name',
  'group_report_notes',
  'last_used_at',
] as const satisfies readonly (keyof ProjectSnakeBody & string)[];
