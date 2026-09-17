import { computed, type Ref } from 'vue';

import { formatNumberWithCommas, parseNumberInput } from '@/utils/number';

export const useFormattedNumberInput = (numericRef: Ref<number | null | undefined>) => {
  const formattedValue = computed(() => formatNumberWithCommas(numericRef.value ?? null));

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    numericRef.value = parseNumberInput(target.value);
  };

  return {
    formattedValue,
    handleInput,
  };
};
