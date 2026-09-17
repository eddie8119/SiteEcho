<template>
  <section id="pain" class="pain-section landing-section">
    <div class="content-container">
      <div class="reveal">
        <h2 class="section-h2">{{ t('landingPage.pain.section_title') }}</h2>
      </div>
      <div class="pain-blocks reveal">
        <div v-for="(pain, index) in painCards" :key="index" class="pain-block">
          <div class="pain-situation">{{ pain.left }}</div>
          <div class="pain-result"><span class="pain-arrow">→</span>{{ pain.right }}</div>
        </div>
      </div>
      <div class="pain-verdict reveal">
        <div class="pain-verdict-inner">
          <div class="pain-verdict-text">
            {{ t('landingPage.pain.verdict_line1') }}
            <br />
            {{ t('landingPage.pain.verdict_line2') }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

interface PainCard {
  left: string;
  right: string;
}

const { t, locale } = useI18n();

const painCards = ref<PainCard[]>([]);

const loadPainCards = () => {
  painCards.value = [
    {
      left: t('landingPage.pain.cards.0.left'),
      right: t('landingPage.pain.cards.0.right'),
    },
    {
      left: t('landingPage.pain.cards.1.left'),
      right: t('landingPage.pain.cards.1.right'),
    },
    {
      left: t('landingPage.pain.cards.2.left'),
      right: t('landingPage.pain.cards.2.right'),
    },
    {
      left: t('landingPage.pain.cards.3.left'),
      right: t('landingPage.pain.cards.3.right'),
    },
  ];
};

loadPainCards();

watch(locale, () => {
  loadPainCards();
});
</script>

<style scoped>
/* ─── PAIN SECTION ─── */
.pain-section {
  background: var(--bg2);
}

.pain-blocks {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 40px;
}

.pain-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-bottom: 1px solid var(--border);
  padding: 24px 0;
}

.pain-block:first-child {
  border-top: 1px solid var(--border);
}

.pain-situation {
  font-size: 15px;
  color: var(--ink2);
  font-weight: 500;
  padding-right: 24px;
  border-right: 1px solid var(--border);
  display: flex;
  align-items: center;
}

.pain-result {
  padding-left: 24px;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--ink3);
  gap: 8px;
}

.pain-arrow {
  color: var(--red);
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.pain-verdict {
  margin-top: 40px;
}

.pain-verdict-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;
  background: var(--brand-bg);
  border: 1.5px solid var(--brand-border);
  color: var(--ink);
  border-radius: 10px;
  padding: 14px 16px;
}

.pain-verdict-text {
  font-size: 28px;
  font-weight: 900;
  white-space: pre-line;
}

.pain-verdict-text span {
  color: var(--brand-text);
}

/* Responsive */
@media (max-width: 900px) {
  .pain-block {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .pain-situation {
    border-right: none;
    padding-right: 0;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }
  .pain-result {
    padding-left: 0;
  }
}
</style>
