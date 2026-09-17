<template>
  <div class="space-y-6">
    <ValuePropositionHero />
    <PricingSection />
    <FeatureComparisonSection />
  </div>
</template>

<script setup lang="ts">
import FeatureComparisonSection from '@/components/billing/FeatureComparisonSection.vue';
import PricingSection from '@/components/billing/PricingSection.vue';
import ValuePropositionHero from '@/components/billing/ValuePropositionHero.vue';
</script>
