<template>
  <section class="px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl space-y-8">
      <H2Title :title="t('billing.faq')" class-name="text-center" />
      <ul
        ref="listRef"
        class="divide-y divide-gray-200 border-t border-gray-200 transition-opacity duration-150 dark:divide-gray-700 dark:border-gray-700"
        :class="{ 'pointer-events-none opacity-0': isMeasuring }"
        :style="listMinHeight ? { minHeight: `${listMinHeight}px` } : undefined"
      >
        <li
          v-for="(item, idx) in items"
          :key="idx"
          class="focus-within:bg-gray-50 focus-within:dark:bg-gray-800/40"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 py-4 text-left"
            :aria-expanded="openIndex === idx"
            @click="toggle(idx)"
          >
            <H3Title :title="t(item.q)" />
            <svg
              class="h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200"
              :class="openIndex === idx ? 'rotate-180' : 'rotate-0'"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <Transition name="faq-collapse">
            <div v-show="openIndex === idx" class="text200-color-difference pb-4">
              <p>{{ t(item.a) }}</p>
            </div>
          </Transition>
        </li>
      </ul>
    </div>
  </section>
</template>
<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import H2Title from '@/components/core/title/H2Title.vue';
import H3Title from '@/components/core/title/H3Title.vue';

const { t, locale } = useI18n();

type Key = string;
const items: Array<{ q: Key; a: Key }> = [
  { q: 'billing.faqBeta.betaChargeQuestion', a: 'billing.faqBeta.betaChargeAnswer' },
  { q: 'billing.faqBeta.afterBetaPricingQuestion', a: 'billing.faqBeta.afterBetaPricingAnswer' },
  { q: 'billing.faqBeta.futurePriceChangeQuestion', a: 'billing.faqBeta.futurePriceChangeAnswer' },
];

const openIndex = ref<number | null>(0);
const listRef = ref<HTMLElement | null>(null);
const listMinHeight = ref<number | null>(null);
const isMeasuring = ref(true);

const measureHeights = async () => {
  if (!listRef.value) return;
  isMeasuring.value = true;
  const originalIndex = openIndex.value;
  let maxHeight = listRef.value.offsetHeight;

  for (let i = 0; i < items.length; i += 1) {
    openIndex.value = i;
    await nextTick();
    maxHeight = Math.max(maxHeight, listRef.value?.offsetHeight ?? 0);
  }

  openIndex.value = originalIndex;
  listMinHeight.value = maxHeight;
  await nextTick();
  isMeasuring.value = false;
};

onMounted(async () => {
  await nextTick();
  await measureHeights();
});

watch(locale, () => {
  measureHeights();
});

const toggle = (idx: number) => {
  openIndex.value = openIndex.value === idx ? null : idx;
};
</script>

<style scoped>
.faq-collapse-enter-active,
.faq-collapse-leave-active {
  transition: all 180ms ease;
}
.faq-collapse-enter-from,
.faq-collapse-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
