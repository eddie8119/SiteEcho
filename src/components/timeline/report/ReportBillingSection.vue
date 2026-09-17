<template>
  <div class="ml-2 space-y-1">
    <div
      v-for="construction in constructions"
      :key="construction"
      class="flex flex-col items-end space-y-0.5"
    >
      <div class="flex w-full items-center justify-between text-sm text-gray-600">
        <span>- {{ construction || $t('report.billingSection.uncategorized') }}</span>
        <div class="flex items-center gap-1">
          <span class="text-gray-400">$</span>
          <input
            :value="modelValue[`${space}-${construction}`]"
            type="number"
            :placeholder="$t('report.billingSection.amountPlaceholder')"
            class="w-32 rounded border border-gray-300 px-2 py-0.5 text-right focus:border-orange-500 focus:outline-none"
            @input="handleInput(construction, $event)"
          />
        </div>
      </div>
      <div v-if="isFromMemory.has(construction)" class="text-xs text-orange-400">
        （{{ $t('report.billingSection.fromMemory') }}）
      </div>
    </div>

    <!-- Space subtotal -->
    <div
      v-if="spaceTotal > 0"
      class="ml-auto mt-2 flex w-max items-center gap-1 text-xs text-gray-500"
    >
      <span>{{ $t('report.billingSection.subtotal') }}</span>
      <span class="font-semibold text-orange-600">${{ formatAmount(spaceTotal) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { usePriceMemory } from '@/composables/usePriceMemory';

const props = defineProps<{
  modelValue: Record<string, number | undefined>;
  space: string;
  constructions: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, number | undefined>];
}>();

const { getPrice, setPrice } = usePriceMemory();

const isFromMemory = ref(new Set<string>());

onMounted(() => {
  const fromMem = new Set<string>();
  props.constructions.forEach((c) => {
    const key = `${props.space}-${c}`;
    const memPrice = getPrice(c);
    if (memPrice !== undefined && props.modelValue[key] === memPrice) {
      fromMem.add(c);
    }
  });
  isFromMemory.value = fromMem;
});

const handleInput = (construction: string, event: Event) => {
  const raw = (event.target as HTMLInputElement).value;
  const amount = raw === '' ? undefined : Number(raw);
  if (amount !== undefined && !isNaN(amount)) {
    setPrice(construction, amount);
  }
  isFromMemory.value.delete(construction);
  emit('update:modelValue', {
    ...props.modelValue,
    [`${props.space}-${construction}`]: amount,
  });
};

const spaceTotal = computed(() =>
  props.constructions.reduce((sum, c) => {
    const val = props.modelValue[`${props.space}-${c}`];
    return sum + (val ?? 0);
  }, 0)
);

const formatAmount = (amount: number): string => amount.toLocaleString('zh-TW');
</script>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
}
</style>
