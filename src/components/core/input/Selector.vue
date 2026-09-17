<template>
  <div class="w-full">
    <LabelText v-if="props.label" :title="props.label" />
    <ElSelect
      :model-value="props.modelValue"
      :placeholder="props.placeholder"
      class="w-full rounded-xl"
      :size="props.size"
      :loading="props.loading"
      :disabled="props.disabled"
      :filterable="props.filterable"
      @update:model-value="updateValue"
      @change="handleChange"
    >
      <ElOption
        v-for="option in props.options"
        :key="option[valueKey] || option[labelKey]"
        :label="option[labelKey]"
        :value="option[valueKey] || option[labelKey]"
        :class="optionClass"
      />
    </ElSelect>
  </div>
</template>

<script setup lang="ts">
import LabelText from '@/components/core/input/LabelText.vue';

interface Props {
  modelValue: string | number | null;
  options: Record<string, unknown>[];
  label?: string;
  placeholder?: string;
  size?: 'default' | 'small' | 'large';
  loading?: boolean;
  disabled?: boolean;
  filterable?: boolean;
  valueKey?: string;
  labelKey?: string;
  optionClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  label: '',
  placeholder: 'Select an option',
  size: 'large',
  loading: false,
  disabled: false,
  filterable: false,
  valueKey: 'value',
  labelKey: 'label',
  optionClass: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void;
  (e: 'change', value: string | number | null): void;
}>();

const updateValue = (value: string | number | null) => {
  emit('update:modelValue', value);
};

const handleChange = (value: string | number | null) => {
  emit('change', value);
};
</script>

<style lang="scss"></style>
