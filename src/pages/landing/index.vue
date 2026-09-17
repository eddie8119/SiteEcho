<template>
  <LandingLayout>
    <HeroSection />
    <PainSection />
    <FeaturesSection />
    <VsSection />
    <DemoSection />
    <CTASection />
  </LandingLayout>
</template>

<script setup lang="ts">
import CTASection from '@/components/landing/mvpSection/CTASection.vue';
import DemoSection from '@/components/landing/mvpSection/DemoSection.vue';
import FeaturesSection from '@/components/landing/mvpSection/FeaturesSection.vue';
import HeroSection from '@/components/landing/mvpSection/HeroSection.vue';
import PainSection from '@/components/landing/mvpSection/PainSection.vue';
import VsSection from '@/components/landing/mvpSection/VsSection.vue';
import LandingLayout from '@/layouts/LandingLayout.vue';
</script>
