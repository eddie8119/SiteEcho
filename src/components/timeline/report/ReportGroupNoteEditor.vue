<template>
  <div class="rounded-lg bg-white p-3 shadow-sm">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm font-medium text-gray-700">
        <span>{{ t('report.groupNoteEditor.title') }}</span>
      </div>
      <button
        v-if="!isEditing"
        class="text-xs font-medium text-orange-600"
        @click="isEditing = true"
      >
        {{ modelValue ? t('report.groupNoteEditor.edit') : t('report.groupNoteEditor.addNote') }}
      </button>
    </div>

    <div v-if="isEditing" class="space-y-2">
      <textarea
        :value="modelValue"
        class="w-full rounded-lg border border-gray-200 p-2 text-base focus:border-orange-500 focus:outline-none"
        rows="3"
        :placeholder="t('report.groupNoteEditor.placeholder')"
        inputmode="text"
        autocorrect="off"
        autocomplete="off"
        spellcheck="false"
        @input="handleInput"
      />
      <div class="flex justify-end gap-2">
        <button class="rounded px-3 py-1 text-xs font-medium text-gray-500" @click="handleDone">
          {{ t('report.groupNoteEditor.done') }}
        </button>
      </div>
    </div>
    <div
      v-else-if="modelValue"
      class="line-clamp-2 text-sm text-gray-600"
      @click="isEditing = true"
    >
      {{ modelValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const isEditing = ref(false);

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

const handleDone = () => {
  isEditing.value = false;
};
</script>
