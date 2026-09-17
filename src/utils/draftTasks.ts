import type { TodoItemDraft } from '@/types/todo';

/**
 * 比對兩份草稿任務是否相同。
 * - 以 JSON 序列化結果比對，順序與內容完全相同才視為一致。
 */
export function areDraftTasksEqual(
  a: TodoItemDraft[] | undefined | null,
  b: TodoItemDraft[] | undefined | null
): boolean {
  const normalizedA = a ?? [];
  const normalizedB = b ?? [];

  // 若長度不同，一定不相同
  if (normalizedA.length !== normalizedB.length) return false;

  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}
