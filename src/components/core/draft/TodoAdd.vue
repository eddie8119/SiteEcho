<template>
  <div class="relative">
    <input
      v-model="todoContent"
      type="text"
      :placeholder="t('placeholder.draft.todo')"
      class="input-border input-common p-3 transition-all duration-200 focus:ring-2"
      @keyup.enter="addTodo"
    />
    <button
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-brand-primary p-2 text-black-900 shadow-md transition-all duration-200 hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-tertiary focus:ring-offset-2 disabled:opacity-60"
      :disabled="!todoContent.trim()"
      aria-label="添加待辦事項"
      @click="addTodo"
    >
      <AddIcon />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { TodoItemDraft } from '@/types/todo';

import AddIcon from '@/components/ui/AddIcon.vue';

const emit = defineEmits<{ (e: 'add-todo-draft', todo: TodoItemDraft): void }>();

const { t } = useI18n();

const todoContent = ref<string>('');
const addTodo = () => {
  if (todoContent.value.trim() === '') return;
  const todo: TodoItemDraft = {
    id: Date.now().toString(),
    content: todoContent.value.trim(),
    completed: false,
    isMoved: false,
  };
  todoContent.value = '';
  emit('add-todo-draft', todo);
};
</script>
