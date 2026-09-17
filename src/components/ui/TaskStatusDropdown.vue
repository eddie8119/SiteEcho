<template>
  <ElDropdown
    :trigger="readOnly ? 'contextmenu' : 'click'"
    :disabled="readOnly"
    @command="handleCommand"
  >
    <button :class="['status-badge-button', readOnly ? '' : 'hover:shadow-sm', statusClass]">
      {{ t(`option.status.${props.status}`) }}
      <svg
        v-if="!readOnly"
        xmlns="http://www.w3.org/2000/svg"
        class="ml-1.5 h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <template v-if="!readOnly" #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem v-for="option in statusOptions" :key="option.value" :command="option.value">
          <div class="flex items-center">
            <div :class="['mr-3 h-3 w-3 rounded-full', option.color]" />
            <span :class="option.textColor">{{ t(`option.status.${option.value}`) }}</span>
          </div>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { TaskStatus } from '@/types/task';

import { TaskStatusEnum } from '@/types/task';

const props = defineProps<{
  status: TaskStatus;
  readOnly?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:status', status: TaskStatus): void }>();

const { t } = useI18n();

const statusOptions = [
  {
    value: TaskStatusEnum.TODO,
    color: 'bg-gray-400',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
  {
    value: TaskStatusEnum.IN_PROGRESS,
    color: 'bg-blue-400',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    value: TaskStatusEnum.DONE,
    color: 'bg-green-400',
    textColor: 'text-green-700 dark:text-green-300',
  },
];

const handleCommand = (command: TaskStatus) => {
  emit('update:status', command);
};

const statusClass = computed(() => {
  switch (props.status) {
    case TaskStatusEnum.DONE:
      return 'bg-green-100 text-green-700';
    case TaskStatusEnum.IN_PROGRESS:
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
});
</script>

<style scoped></style>
