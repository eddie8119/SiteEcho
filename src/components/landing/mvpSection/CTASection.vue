<template>
  <section id="cta" class="cta-section landing-section">
    <div class="content-container reveal">
      <p class="cta-sub">{{ t('landingPage.cta.section_subtitle') }}</p>
      <h2 class="cta-h2">
        {{ t('landingPage.cta.title') }}
      </h2>
      <p class="cta-money2">{{ t('landingPage.cta.description') }}</p>
      <div class="flex flex-col items-center justify-center gap-3">
        <router-link :to="landingRoute" class="cta-btn-big">{{
          t('landingPage.cta.button')
        }}</router-link>
        <AppStoreButton />
      </div>
      <div class="cta-perks">
        <span v-for="(perk, index) in perks" :key="index" class="cta-perk">{{ perk }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import AppStoreButton from './AppStoreButton.vue';

import { useLandingRoute } from '@/composables/useLandingRoute';

const { t, locale } = useI18n();
const { landingRoute } = useLandingRoute();

const perks = ref<string[]>([]);

const loadPerks = () => {
  perks.value = [
    t('landingPage.cta.perks.0'),
    t('landingPage.cta.perks.1'),
    t('landingPage.cta.perks.2'),
  ];
};

loadPerks();

watch(locale, () => {
  loadPerks();
});
</script>

<style scoped>
.cta-section {
  background: var(--bg3);
  color: var(--ink);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  display: none;
}

.cta-sub {
  font-family: var(--mono);
  font-size: 16px;
  color: var(--muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.cta-h2 {
  font-size: clamp(30px, 5vw, 58px);
  font-weight: 900;
  line-height: 1.15;
  margin-bottom: 14px;
}

.cta-h2 .accent {
  color: var(--brand);
}

.cta-money2 {
  font-family: var(--mono);
  font-size: clamp(16px, 2vw, 22px);
  color: var(--ink3);
  margin-bottom: 40px;
}

.cta-btn-big {
  display: inline-block;
  background: var(--brand);
  color: var(--ink);
  padding: 18px 48px;
  border-radius: 9px;
  border: none;
  font-size: 17px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(251, 192, 45, 0.4);
}

.cta-btn-big:hover {
  background: var(--brand-dark);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(251, 192, 45, 0.45);
}

.cta-note2 {
  margin-top: 18px;
  font-size: 14px;
  color: var(--muted);
}

.cta-perks {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.cta-perk {
  font-size: 13px;
  color: var(--ink3);
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
}

.cta-perk::before {
  content: '✓';
  color: var(--brand);
}

@media (max-width: 640px) {
  .cta-btn-big {
    padding: 12px 24px;
    font-size: 16px;
  }
}
</style>
