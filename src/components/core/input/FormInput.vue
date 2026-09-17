<template>
  <ElFormItem :error="error">
    <ElInput
      :model-value="modelValue"
      :placeholder="placeholder"
      :name="name"
      :type="type"
      :show-password="type === 'password'"
      @update:model-value="$emit('update:modelValue', $event)"
      @blur="$emit('blur')"
    >
      <template #prefix />
    </ElInput>
  </ElFormItem>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  placeholder: string;
  name: string;
  type: string;
  error?: string;
  icon?: string; //不太想使用
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
}>();
</script>

<style lang="scss" scoped></style>
