<template>
  <LandingLayout>
    <section class="landing-section min-h-screen bg-white pt-[150px] md:pt-[120px]">
      <div class="content-container">
        <!-- Hero Section -->
        <div class="md:mb-15 mb-20">
          <SimpleHeroSection
            :title="t('landingPage.moreApps.hero.title')"
            :subtitle="t('landingPage.moreApps.hero.subtitle')"
            custom-class="reveal"
          />
        </div>

        <!-- Apps Grid -->
        <div
          class="mb-15 mx-auto grid max-w-[1200px] grid-cols-1 gap-8 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] md:gap-8"
        >
          <a
            v-for="app in apps"
            :key="app.name"
            :href="app.link"
            target="_blank"
            rel="noopener noreferrer"
            class="text-decoration-none reveal group block rounded-2xl border border-gray-200 bg-white p-10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl md:p-8"
          >
            <div
              class="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-gray-100"
            >
              <img :src="app.image" :alt="app.name" class="h-full w-full object-cover" />
            </div>
            <div class="flex flex-col gap-3">
              <h3 class="m-0 text-2xl font-extrabold text-gray-900 md:text-xl">{{ app.name }}</h3>
              <p class="m-0 text-base leading-[1.6] text-gray-600 md:text-sm">
                {{ app.description }}
              </p>
              <div class="text-black mt-4 flex items-center gap-2 text-sm font-semibold">
                <span>{{ t('landingPage.moreApps.explore') }}</span>
                <span class="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import SimpleHeroSection from '@/components/landing/mvpSection/SimpleHeroSection.vue';
import { getFunsugarApps } from '@/constants/funsugarApps';
import LandingLayout from '@/layouts/LandingLayout.vue';

const { t } = useI18n();
const { apps } = getFunsugarApps();
</script>
