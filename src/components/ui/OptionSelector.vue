<template>
  <ElSelect v-model="model" :class="[className]" v-bind="$attrs">
    <ElOption
      v-for="option in options"
      :key="String(option.value)"
      :label="useI18nLabel ? t(`option.${namespace}.${option.value}`) : String(option.value)"
      :value="option.value"
    />
  </ElSelect>
</template>

<script setup lang="ts">
import { ElOption, ElSelect } from 'element-plus';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { SelectorOption } from '@/types/selection';

const {
  modelValue,
  options,
  className,
  namespace = 'status',
  useI18nLabel = true,
} = defineProps<{
  modelValue: string | undefined;
  options: SelectorOption[];
  className?: string;
  namespace?: string;
  useI18nLabel?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const { t } = useI18n();

const model = computed({
  get: () => modelValue,
  set: (val: string) => emit('update:modelValue', val),
});
</script>
