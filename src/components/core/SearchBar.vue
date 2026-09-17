<template>
  <div class="relative">
    <svg
      class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-base focus:border-blue-500 focus:outline-none"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="handleBlur"
      @focus="handleFocus"
      inputmode="search"
      autocorrect="off"
      autocomplete="off"
      spellcheck="false"
    />
    <button
      v-if="modelValue"
      class="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gray-500 text-gray-600 hover:border-gray-600 hover:text-gray-800 focus:outline-none"
      @click="emit('update:modelValue', '')"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  placeholder: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  focus: [];
  blur: [];
}>();

const handleFocus = () => {
  emit('focus');
};

const handleBlur = () => {
  emit('blur');
};
</script>
