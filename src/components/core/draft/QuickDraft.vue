<template>
  <div
    class="panel-container h-full w-full max-w-md rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-8"
  >
    <H1Title :title="t('title.quick_draft')" class-name="text-center mb-6" />
    <TodoAdd class="mb-6" @add-todo-draft="addTodoDraft" />
    <TodoFilter
      :selected="filter"
      class="mb-4"
      @change-filter="filter = $event"
      @clear-done="clearDone"
    />

    <div
      v-if="filteredTodos.length === 0"
      class="flex h-40 items-center justify-center text-gray-400"
    >
      {{
        filter === 'all'
          ? t('message.sign.no_todo')
          : filter === 'done'
            ? t('message.sign.no_done')
            : t('message.sign.no_undone')
      }}
    </div>

    <div class="max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
      <TransitionGroup name="todo-list" tag="div" class="space-y-3">
        <TodoItem
          v-for="todo in filteredTodos"
          :key="todo.id"
          :todo-item="todo"
          class="todo-list-item"
          @update:todo-item="updateTodo"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import TodoAdd from './TodoAdd.vue';
import TodoFilter from './TodoFilter.vue';
import TodoItem from './TodoItem.vue';

import type { DraftResponse } from '@/types/response';
import type { TodoFilterType, TodoItemDraft } from '@/types/todo';

import H1Title from '@/components/core/title/H1Title.vue';
import { useDraft } from '@/composables/query/useDraft';
import { useLocalStorageRef } from '@/composables/useLocalStorage';
import { areDraftTasksEqual } from '@/utils/draftTasks.ts';

const LOCAL_STORAGE_KEY = 'quick_draft_todos';

const { t } = useI18n();
const { fetchedDraft, createDraft, updateDraft } = useDraft();
const { state: todos, clear: clearTodos } = useLocalStorageRef<TodoItemDraft[]>(
  LOCAL_STORAGE_KEY,
  []
);

// 建立 LocalStorage 副本
watch(
  [fetchedDraft],
  ([newDraft]) => {
    if (newDraft?.tasks && Array.isArray(newDraft.tasks)) {
      // 從後端資料建立 TodoItemDraft 陣列
      todos.value = newDraft.tasks.map((task) => ({
        id: task.id,
        content: task.content,
        completed: task.completed,
        // 後端欄位為可選，預設成 false 以符合 TodoItemDraft.boolean 型別
        isMoved: task.isMoved ?? false,
      }));
    } else {
      // 如果後端沒資料，清空本地，確保乾淨的開始
      todos.value = [];
    }
  },
  { immediate: true }
);

const saveDraft = async () => {
  const localData = todos.value;

  try {
    const payload: Partial<DraftResponse> = {
      tasks: localData.map((task) => ({
        id: task.id,
        content: task.content,
        completed: task.completed,
        // 儲存 isMoved 狀態，保持與後端結構一致
        isMoved: task.isMoved,
      })),
    };

    const serverTasks: TodoItemDraft[] = (fetchedDraft.value?.tasks ?? []).map((task) => ({
      id: task.id,
      content: task.content,
      completed: task.completed,
      isMoved: task.isMoved ?? false,
    }));

    const hasChanges = !areDraftTasksEqual(serverTasks, localData);

    if (fetchedDraft.value?.id) {
      if (hasChanges) {
        await updateDraft(fetchedDraft.value.id, payload);
      }
    } else if (localData.length > 0) {
      await createDraft(payload);
    }
  } finally {
    // 清空本次的 LocalStorage 副本與對應的 localStorage key
    todos.value = [];
    clearTodos();
  }
};

// 組件銷毀（包含刷新時的卸載）前保存草稿
onBeforeUnmount(() => {
  void saveDraft();
});

// 監聽瀏覽器刷新 / 關閉事件，嘗試在離開前保存草稿
onMounted(() => {
  const handleBeforeUnload = () => {
    void saveDraft();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });
});

const addTodoDraft = (todo: TodoItemDraft) => {
  todos.value = [...todos.value, todo];
};

const updateTodo = (updatedTodo: TodoItemDraft) => {
  // 使用不可變更新方式，確保 Vue 能可靠偵測變更
  todos.value = todos.value.map((todo) =>
    todo.id === updatedTodo.id ? { ...todo, ...updatedTodo } : todo
  );
};

const clearDone = () => {
  todos.value = todos.value.filter((todo) => !todo.completed);
};

const filter = ref<TodoFilterType>('all');
const filteredTodos = computed(() => {
  switch (filter.value) {
    case 'done':
      return todos.value.filter((todo) => todo.completed);
    case 'todo':
      return todos.value.filter((todo) => !todo.completed);
    default:
      return todos.value;
  }
});
</script>
