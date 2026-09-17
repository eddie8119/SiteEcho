<template>
  <section id="demo" class="demo-section landing-section">
    <div class="content-container">
      <div class="demo-content reveal">
        <div class="demo-left">
          <h2 class="section-h2">{{ t('landingPage.demo.section_title') }}</h2>
          <div class="feature-list">
            <div v-for="(feature, index) in features" :key="index" class="feature-item">
              <span class="feature-check">✓</span>
              <span class="feature-text">{{ feature }}</span>
            </div>
          </div>
        </div>
        <div class="demo-right">
          <div class="screenshot-frame">
            <img
              :src="screenshot1"
              :alt="t('landingPage.demo.screenshot_alt')"
              class="screenshot-img"
            />
          </div>
        </div>
      </div>
      <div class="demo-content reveal">
        <div class="demo-left">
          <div class="screenshot-frame">
            <img
              :src="screenshot2"
              :alt="t('landingPage.demo.screenshot_alt')"
              class="screenshot-img"
            />
          </div>
        </div>
        <div class="demo-right">
          <h2 class="section-h2">{{ t('landingPage.demo.pain.title') }}</h2>
          <p class="subtitle">
            {{ t('landingPage.demo.pain.subtitle_line1') }}<br /><br />
            {{ t('landingPage.demo.pain.subtitle_line2') }}<br /><br />
            {{ t('landingPage.demo.pain.subtitle_line3') }}<br /><br />
            {{ t('landingPage.demo.pain.question_1') }}<br />
            {{ t('landingPage.demo.pain.question_2') }}<br />
            {{ t('landingPage.demo.pain.question_3') }}
          </p>
          <div class="my-2" />
          <p class="cta-text">
            {{ t('landingPage.demo.pain.cta_prefix') }}<br /><br />
            {{ t('landingPage.demo.pain.cta_content') }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import screenshot1 from '@/assets/images/app_screenshot_1.jpg';
import screenshot2 from '@/assets/images/app_screenshot_2.jpg';

const { t, locale } = useI18n();

const features = ref<string[]>([]);

const loadFeatures = () => {
  features.value = [
    t('landingPage.demo.features.0'),
    t('landingPage.demo.features.1'),
    t('landingPage.demo.features.2'),
    t('landingPage.demo.features.3'),
  ];
};

loadFeatures();

watch(locale, () => {
  loadFeatures();
});

onMounted(() => {
  // Setup intersection observer for reveal animations
  const reveals = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const siblings = Array.from(e.target.parentElement?.children || []);
          const idx = siblings.indexOf(e.target);
          setTimeout(() => e.target.classList.add('visible'), Math.min(idx * 80, 250));
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  reveals.forEach((r) => io.observe(r));
});
</script>

<style scoped>
.demo-section {
  background: var(--bg2);
}

.demo-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 120px;
  align-items: center;
  margin-top: 48px;
}

.demo-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.subtitle {
  font-size: 18px;
  line-height: 1.8;
  color: var(--ink2);
  margin: 0;
}

.cta-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
  white-space: pre-line;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: var(--ink2);
}

.feature-check {
  color: var(--green);
  font-weight: 900;
  font-size: 18px;
  flex-shrink: 0;
}

.feature-text {
  font-weight: 500;
  font-size: 20spx;
  white-space: pre-line;
}

.demo-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.screenshot-frame {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 9/19;
  background: var(--white);
  border-radius: 24px;
  border: 2px solid var(--ink);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.screenshot-frame:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.screenshot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--bg);
}

@media (max-width: 1024px) {
  .demo-content {
    gap: 64px;
  }

  .screenshot-frame {
    max-width: 280px;
  }
}

@media (max-width: 767px) {
  .demo-content {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .demo-right {
    order: -1;
  }
}

@media (max-width: 640px) {
  .demo-content {
    margin-top: 32px;
  }

  .feature-item {
    font-size: 15px;
  }
}
</style>
