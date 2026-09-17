<template>
  <section>
    <div class="mx-auto max-w-3xl space-y-6">
      <H2Title :title="t('billing.featureComparison.title')" class-name="text-center" />

      <div
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <div class="overflow-x-auto">
          <table
            class="w-full min-w-[420px] table-fixed divide-y divide-gray-200 text-sm dark:divide-gray-700 md:min-w-full"
          >
            <thead>
              <tr class="bg-gray-50 dark:bg-gray-800">
                <th
                  scope="col"
                  class="w-[40%] px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200"
                >
                  {{ t('billing.featureComparison.feature') }}
                </th>

                <th
                  v-for="plan in planColumns"
                  :key="plan"
                  scope="col"
                  class="w-[30%] px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-200"
                >
                  {{ planNameMap[plan] }}
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr
                v-for="feature in features"
                :key="feature.key"
                class="text-gray-900 dark:text-gray-100"
              >
                <th scope="row" class="w-[40%] px-4 py-4 text-left font-medium leading-relaxed">
                  {{ feature.label }}
                </th>

                <td
                  v-for="plan in planColumns"
                  :key="`${feature.key}-${plan}`"
                  class="w-[30%] px-3 py-4 text-center align-middle"
                >
                  <span v-if="feature.values[plan] === 'check'" aria-hidden="true"> ✓ </span>

                  <span v-else-if="feature.values[plan] === 'dash'"> — </span>

                  <span v-else>
                    {{
                      t(
                        feature.valueKey?.[plan] || feature.values[plan],
                        feature.valueParams?.[plan] || {}
                      )
                    }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import H2Title from '@/components/core/title/H2Title.vue';
import { PLAN_FEATURE_COMPARISON } from '@/config/planConfig';

const { t } = useI18n();

type PlanKey = 'free' | 'pro';

const planColumns: PlanKey[] = ['free', 'pro'];

const planNameMap: Record<PlanKey, string> = {
  free: 'Free',
  pro: 'Pro',
};

const features = computed(() =>
  PLAN_FEATURE_COMPARISON.map((feature) => ({
    ...feature,
    label: t(feature.labelKey || ''),
    values: feature.values as Record<PlanKey, string>,
  }))
);
</script>
