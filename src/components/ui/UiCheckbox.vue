<template>
  <label class="flex cursor-pointer items-center">
    <div class="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
      <input
        ref="inputRef"
        type="checkbox"
        class="peer sr-only"
        :checked="isChecked"
        :value="value"
        @change="onChange"
      />
      <div
        class="h-6 w-6 rounded-md border-2 border-gray-300 bg-white transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-200"
      />
      <CheckIcon />
    </div>
    <span v-if="$slots.default" class="ml-2"><slot /></span>
  </label>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import CheckIcon from '@/components/ui/CheckIcon.vue';

const props = defineProps<{
  modelValue: boolean | string[];
  value?: string;
  indeterminate?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean | string[]): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const isArrayModel = computed(() => Array.isArray(props.modelValue));
const isChecked = computed<boolean>(() => {
  if (isArrayModel.value) {
    const arr = props.modelValue as string[];
    return props.value ? arr.includes(props.value) : false;
  }
  return props.modelValue as boolean;
});

const applyIndeterminate = () => {
  if (inputRef.value) inputRef.value.indeterminate = !!props.indeterminate;
};

onMounted(applyIndeterminate);
watch(() => props.indeterminate, applyIndeterminate);

const onChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (isArrayModel.value) {
    const arr = [...(props.modelValue as string[])];
    const val = props.value as string;
    const idx = arr.indexOf(val);
    if (target.checked && idx === -1) arr.push(val);
    else if (!target.checked && idx !== -1) arr.splice(idx, 1);
    emit('update:modelValue', arr);
  } else {
    emit('update:modelValue', !!target.checked);
  }
};
</script>
