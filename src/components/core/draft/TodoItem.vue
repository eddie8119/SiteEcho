<template>
  <div
    class="background-color-difference group mb-2 rounded-lg p-3 shadow-sm transition-all duration-200 hover:border-blue-100 hover:shadow-md"
    :class="{ 'bg-slate-200': props.todoItem.completed }"
  >
    <label class="flex w-full cursor-pointer items-center">
      <UiCheckbox :model-value="todoItem.completed" @update:model-value="onToggle" />
      <span
        class="text-color-difference ml-2 flex-1 transition-all"
        :class="{ 'text-gray-400 line-through': todoItem.completed }"
      >
        {{ todoItem.content }}
      </span>

      <TextButton
        variant="primary"
        size="sm"
        class="min-h-[30px] w-full max-w-[120px] whitespace-normal break-words px-2 text-center text-xs leading-tight lg:w-auto"
        @click="showMoveToProjectDialog = true"
      >
        {{ t('button.move_to_project') }}
      </TextButton>
      <!--  -->
      <MoveDialog
        v-model="showMoveToProjectDialog"
        :target="todoItem"
        @update:target="updateTodo"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { TodoItemDraft } from '@/types/todo';

import TextButton from '@/components/core/button/TextButton.vue';
import MoveDialog from '@/components/core/dialog/MoveDialog.vue';
import UiCheckbox from '@/components/ui/UiCheckbox.vue';

const props = defineProps<{
  todoItem: TodoItemDraft;
}>();

const emit = defineEmits<{
  (e: 'update:todo-item', todo: TodoItemDraft): void;
}>();

const { t } = useI18n();

const showMoveToProjectDialog = ref(false);

const updateTodo = (updated: TodoItemDraft) => {
  emit('update:todo-item', updated);
};

const onToggle = (value: boolean | string[]) => {
  const checked = Array.isArray(value) ? value.length > 0 : value;

  emit('update:todo-item', {
    ...props.todoItem,
    completed: checked,
  });
};
</script>
