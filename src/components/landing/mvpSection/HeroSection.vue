<template>
  <section id="hero" class="hero-section landing-section">
    <div class="hero content-container">
      <div class="hero-left reveal mt-20 md:mt-0">
        <div v-if="showWelcomeBack" class="welcome-back-badge">
          {{ t('landingPage.hero.welcome_back') }}
        </div>
        <h1 class="hero-h1">
          {{ t('landingPage.hero.title_line1') }}<br />{{ t('landingPage.hero.title_line2')
          }}<br />{{ t('landingPage.hero.title_line3') }}
        </h1>
        <p class="hero-sub">
          {{ t('landingPage.hero.subtitle_line1') }}<br />{{ t('landingPage.hero.subtitle_line2') }}
        </p>
        <div class="hero-btns">
          <router-link :to="landingRoute" class="btn-primary">{{
            t('landingPage.hero.cta_button')
          }}</router-link>
          <AppStoreButton />
          <!-- <p class="hero-note">先用手機 App 拍照，並提供在電腦同步整理</p> -->
        </div>
        <div class="hero-lang-badge">
          <img src="/src/assets/icons/Global.svg" class="lang-dot" alt="Global" />
          {{ t('landingPage.hero.lang_support') }}
        </div>
      </div>
      <div class="hero-right reveal">
        <div class="comparison-container">
          <div class="vs-badge">VS</div>
          <img src="/Product_1.png" alt="Before" class="comparison-image before" />
          <span class="comparison-label before-label">{{
            t('landingPage.hero.comparison_before')
          }}</span>
          <img src="/Product_2.png" alt="After" class="comparison-image after" />
          <span class="comparison-label after-label">{{
            t('landingPage.hero.comparison_after')
          }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import AppStoreButton from './AppStoreButton.vue';

import { useLandingRoute } from '@/composables/useLandingRoute';
import { isReturningVisitor } from '@/utils/visitTracker';

const { t } = useI18n();
const { landingRoute } = useLandingRoute();
const showWelcomeBack = computed(() => isReturningVisitor());

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
/* ─── HERO ─── */
.hero-section {
  background: var(--bg-hero);
  min-height: 100vh;
}

.hero {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 64px;
}

@media (max-width: 1200px) {
  .hero {
    gap: 40px;
  }

  .hero-h1 {
    font-size: clamp(32px, 5vw, 48px);
  }
}

.blink-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  animation: blink 1.4s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}

.hero-h1 {
  font-size: clamp(34px, 3.8vw, 54px);
  font-weight: 900;
  line-height: 1.18;
  color: var(--ink);
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}

.hero-sub {
  font-size: 16px;
  color: var(--ink3);
  line-height: 1.75;
  margin-bottom: 36px;
  max-width: 460px;
}

.hero-sub strong {
  color: var(--ink);
  font-weight: 700;
}

.hero-btns {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.hero-note {
  font-size: 14px;
  color: var(--ink3);
  margin-top: 0;
  margin-bottom: 0;
}

.hero-manual-link {
  margin-top: 12px;
}

.hero-manual-link a {
  font-size: 14px;
  color: var(--ink2);
  text-decoration: none;
  transition: color 0.15s;
}

.hero-manual-link a:hover {
  color: var(--brand);
  text-decoration: underline;
}

.hero-lang-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--ink3);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 12px;
  font-family: var(--mono);
}

.lang-dot {
  width: 14px;
  height: 14px;
}

.lang-sep {
  color: var(--muted);
  margin: 0 2px;
}

.btn-primary {
  background: var(--brand);
  color: var(--ink);
  font-weight: 700;
  font-size: 15px;
  padding: 13px 28px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  display: inline-block;
  box-shadow: 0 2px 8px rgba(251, 192, 45, 0.35);
}

.btn-primary:hover {
  background: var(--brand-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(251, 192, 45, 0.4);
}

.btn-ghost {
  background: transparent;
  color: var(--ink2);
  font-weight: 600;
  font-size: 15px;
  padding: 12px 24px;
  border-radius: 7px;
  border: 1.5px solid var(--border2);
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
  display: inline-block;
}

.btn-ghost:hover {
  border-color: var(--ink2);
  background: var(--bg2);
}

/* hero right – comparison visual */
.hero-right {
  position: relative;
}

.comparison-container {
  position: relative;
  width: 100%;
  max-width: 380px;
  height: 500px;
}

.vs-badge {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--brand);
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 18px;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.comparison-image {
  position: absolute;
  width: 70%;
  max-width: 260px;
  height: auto;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.comparison-image.before {
  top: -6%;
  left: 2%;
  z-index: 1;
  transform: rotate(-4deg);
}

.comparison-image.after {
  bottom: 16%;
  right: -18%;
  z-index: 2;
  transform: rotate(4deg);
}

.comparison-image.before:hover {
  transform: rotate(-8deg) scale(1.02);
}

.comparison-image.after:hover {
  transform: rotate(8deg) scale(1.02);
}

.comparison-label {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--mono);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 3;
}

.comparison-label.before-label {
  top: -8%;
  left: -40px;
  transform: translateY(-50%) rotate(-15deg);
  background: var(--ink);
  color: #fff;
}

.comparison-label.after-label {
  top: 92%;
  right: -80px;
  transform: translateY(-50%) rotate(15deg);
  background: var(--ink);
  color: #fff;
}

.welcome-back-badge {
  display: inline-block;
  color: var(--ink);
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 16px;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero-section {
    margin-top: 80px;
    padding: 120px 32px 60px;
  }

  .hero {
    min-height: auto;
  }

  .comparison-container {
    max-width: 320px;
    height: 420px;
  }

  .comparison-image {
    width: 65%;
    max-width: 200px;
  }

  .comparison-image.after {
    right: -12%;
  }

  .comparison-label.before-label {
    left: -30px;
    font-size: 15px;
  }

  .comparison-label.after-label {
    right: -40px;
    font-size: 15px;
  }
}

@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 90px 24px 56px;
    gap: 120px;
  }

  .comparison-container {
    max-width: 280px;
    height: 360px;
    margin: 0 auto;
  }

  .comparison-image {
    width: 60%;
    max-width: 160px;
  }

  .comparison-image.before {
    top: -2%;
    left: 8%;
  }

  .comparison-image.after {
    bottom: 8%;
    right: -8%;
  }

  .comparison-label.before-label {
    left: -25px;
    font-size: 14px;
    padding: 6px 10px;
  }

  .comparison-label.after-label {
    top: 95%;
    right: -20px;
    font-size: 14px;
    padding: 6px 10px;
  }

  .vs-badge {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 24px 16px 32px;
  }

  .hero-left {
    text-align: left;
  }

  .hero-h1 {
    font-size: 32px;
  }

  .hero-sub {
    font-size: 15px;
    margin-left: 0;
    margin-right: 0;
  }

  .hero-btns {
    justify-content: flex-start;
  }

  .btn-primary,
  .btn-ghost {
    width: 100%;
    text-align: center;
    justify-content: center;
    padding: 10px 20px;
  }
}
</style>
