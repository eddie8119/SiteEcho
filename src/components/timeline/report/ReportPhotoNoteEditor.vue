<template>
  <div class="rounded-lg border border-orange-100 bg-orange-50/30 p-3">
    <div class="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
      <div class="flex items-center gap-2">
        <span>{{ $t('report.photoNoteEditor.title') }}</span>
      </div>
    </div>
    <textarea
      :value="modelValue"
      class="w-full rounded-lg border border-gray-200 bg-white p-2 text-base focus:border-orange-500 focus:outline-none"
      rows="2"
      :placeholder="$t('report.photoNoteEditor.placeholder')"
      inputmode="text"
      autocorrect="off"
      autocomplete="off"
      spellcheck="false"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="mt-1 flex justify-end gap-2">
      <button
        v-if="originalNote"
        class="rounded px-3 py-1 text-xs font-medium text-gray-500"
        @click="emit('update:modelValue', originalNote)"
      >
        {{ $t('report.photoNoteEditor.useNote') }}
      </button>
      <button class="rounded px-3 py-1 text-xs font-medium text-gray-500" @click="handleClear">
        {{ $t('report.photoNoteEditor.clear') }}
      </button>
      <button class="rounded px-3 py-1 text-xs font-medium text-orange-600" @click="emit('done')">
        {{ $t('report.photoNoteEditor.done') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  originalNote?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  done: [];
}>();

const handleClear = () => {
  emit('update:modelValue', '');
  emit('done');
};
</script>
