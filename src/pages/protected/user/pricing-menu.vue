<template>
  <div class="space-y-6">
    <!-- Value Proposition Hero -->
    <ValuePropositionHero />

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PricingSection />
    </div>
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FeatureComparisonSection />
    </div>
    <!-- <PricingFAQ /> -->
  </div>
</template>

<script setup lang="ts">
import FeatureComparisonSection from '@/components/billing/FeatureComparisonSection.vue';
// import PricingFAQ from '@/components/billing/PricingFAQ.vue';
import PricingSection from '@/components/billing/PricingSection.vue';
import ValuePropositionHero from '@/components/billing/ValuePropositionHero.vue';
</script>
