<template>
  <LandingLayout>
    <section class="landing-section min-h-screen bg-white pt-[150px] md:pt-[120px]">
      <div class="content-container">
        <!-- Value Proposition Hero -->
        <ValuePropositionHero />

        <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <PricingSection />
        </div>
        <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <FeatureComparisonSection />
        </div>
      </div>
    </section>
  </LandingLayout>
</template>

<script setup lang="ts">
import FeatureComparisonSection from '@/components/billing/FeatureComparisonSection.vue';
import PricingSection from '@/components/billing/PricingSection.vue';
import ValuePropositionHero from '@/components/billing/ValuePropositionHero.vue';
import LandingLayout from '@/layouts/LandingLayout.vue';
</script>
