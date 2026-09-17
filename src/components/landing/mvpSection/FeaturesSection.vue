<template>
  <section id="features" class="features-section landing-section">
    <div class="content-container">
      <div class="mb-12 text-center">
        <span class="section-eyebrow">{{ t('landingPage.features.section_title') }}</span>
        <div class="feat-manual-link">
          <a
            :href="notionManualLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-600 underline hover:text-brand-primary"
          >
            {{ t('landingPage.features.manual_link') }}
          </a>
        </div>
      </div>
      <div class="feat-grid2">
        <div v-for="(feature, index) in features" :key="index" class="feat-card2 reveal">
          <div class="feat-num2">{{ feature.number }}</div>
          <img :src="feature.icon" class="feat-icon2" alt="" />
          <div class="feat-title2">{{ feature.title }}</div>
          <div class="feat-desc2">{{ feature.description }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import CautionIcon from '@/assets/icons/Caution.png';
import LocationIcon from '@/assets/icons/Location.png';
import PhotoIcon from '@/assets/icons/Photo.png';
import ReportIcon from '@/assets/icons/Report.png';
import { useLocaleLink } from '@/composables/useLocaleLink';

const { t } = useI18n();
const { notionManualLink } = useLocaleLink();

const features = computed(() => [
  {
    number: '01',
    icon: PhotoIcon,
    title: t('landingPage.features.photo.title'),
    description: t('landingPage.features.photo.description'),
  },
  {
    number: '02',
    icon: LocationIcon,
    title: t('landingPage.features.tag.title'),
    description: t('landingPage.features.tag.description'),
  },
  {
    number: '03',
    icon: CautionIcon,
    title: t('landingPage.features.track.title'),
    description: t('landingPage.features.track.description'),
  },
  {
    number: '04',
    icon: ReportIcon,
    title: t('landingPage.features.report.title'),
    description: t('landingPage.features.report.description'),
  },
]);
</script>

<style scoped>
.features-section {
  background: var(--bg2);
}

.feat-grid2 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 52px;
}

.feat-card2 {
  background: var(--white);
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 32px 26px;
  transition: all 0.2s;
}

.feat-card2:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.07);
  transform: translateY(-2px);
}

.feat-num2 {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 10px;
}

.feat-icon2 {
  width: 32px;
  height: 32px;
  margin-bottom: 14px;
  display: block;
}

.feat-title2 {
  font-size: 18px;
  font-weight: 900;
  color: var(--ink);
  margin-bottom: 8px;
}

.feat-desc2 {
  font-size: 14px;
  color: var(--ink3);
  line-height: 1.65;
}

.feat-manual-link {
  margin-top: 8px;
}

.feat-manual-link a {
  font-size: 14px;
  color: var(--ink2);
  text-decoration: none;
  transition: color 0.15s;
}

.feat-manual-link a:hover {
  color: var(--brand);
  text-decoration: underline;
}

@media (min-width: 768px) and (max-width: 1024px) {
  .feat-grid2 {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 767px) {
  .feat-grid2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .features-section {
    padding: 56px 20px;
  }

  .feat-grid2 {
    grid-template-columns: repeat(2, 1fr);
    margin-top: 36px;
    gap: 12px;
  }

  .feat-card2 {
    padding: 24px 20px;
  }

  .feat-title2 {
    font-size: 17px;
  }

  .feat-desc2 {
    font-size: 13px;
  }
}
</style>
