<template>
  <section id="vs" class="vs-section landing-section">
    <div class="content-container">
      <div class="reveal">
        <span class="section-eyebrow">{{ t('landingPage.vs.section_eyebrow') }}</span>
        <h2 class="section-h2">{{ t('landingPage.vs.section_title') }}</h2>
        <p class="section-sub vs-killer-line">{{ t('landingPage.vs.section_subtitle') }}</p>
      </div>

      <div class="vs-grid reveal">
        <!-- LEFT: Before side -->
        <div class="vs-col vs-bad">
          <div class="vs-col-header bad-header">
            <div>
              <div class="vs-col-title">{{ t('landingPage.vs.before.title') }}</div>
              <div class="vs-col-sub">{{ t('landingPage.vs.before.subtitle') }}</div>
            </div>
          </div>

          <!-- Photo album mockup -->
          <div class="album-mock">
            <div class="album-question">
              <span class="question-avatar">👤</span>
              <span class="question-text">{{ t('landingPage.vs.before.question') }}</span>
            </div>
            <div class="album-header">
              <span class="album-title">{{ t('landingPage.vs.before.album_title') }}</span>
            </div>
            <div class="album-dates">
              <div v-for="(photo, index) in photos" :key="index" class="album-date-item">
                {{ photo.date }}
              </div>
            </div>
            <div class="album-problems">
              <div v-for="(problem, index) in beforeProblems" :key="index" class="album-problem">
                {{ problem }}
              </div>
            </div>
          </div>

          <div class="vs-problems">
            <div v-for="(problem, index) in problems" :key="index" class="vs-problem-item">
              <span class="vpi-x">✕</span>{{ problem }}
            </div>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="vs-divider">
          <div class="vs-divider-line" />
          <div class="vs-divider-badge">VS</div>
          <div class="vs-divider-line" />
        </div>

        <!-- RIGHT: After side -->
        <div class="vs-col vs-good">
          <div class="vs-col-header good-header">
            <div>
              <div class="vs-col-title">{{ t('landingPage.vs.after.title') }}</div>
              <div class="vs-col-sub">{{ t('landingPage.vs.after.subtitle') }}</div>
            </div>
          </div>

          <!-- SiteNear mockup -->
          <div class="SiteNear-mock">
            <div class="SiteNear-header">
              <span class="SiteNear-title">{{ t('landingPage.vs.after.space') }}</span>
            </div>
            <div class="SiteNear-list">
              <div class="SiteNear-item">
                <div class="SiteNear-icon">🏷</div>
                <div class="SiteNear-content">
                  <div class="SiteNear-task">{{ t('landingPage.vs.after.task') }}</div>
                  <div class="SiteNear-status SiteNear-pending">
                    <img src="@/assets/icons/Caution.png" alt="Pending" class="status-icon" />
                  </div>
                </div>
              </div>
              <div class="SiteNear-item">
                <div class="SiteNear-icon">🏷</div>
                <div class="SiteNear-content">
                  <div class="SiteNear-task">{{ t('landingPage.vs.after.task') }}</div>
                  <div class="SiteNear-status SiteNear-done">
                    <div class="status-check">
                      <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="SiteNear-result">
              <span class="SiteNear-success">✓ {{ t('landingPage.vs.after.result') }}</span>
            </div>
          </div>

          <div class="vs-goods">
            <div v-for="(good, index) in goods" :key="index" class="vs-good-item">
              <span class="vgi-check">✓</span>{{ good }}
            </div>
          </div>
        </div>
      </div>

      <!-- Product philosophy clarification -->
      <div class="vs-philosophy reveal">
        <div class="philosophy-content">
          <div class="philosophy-text">
            <div class="philosophy-title">{{ t('landingPage.vs.philosophy.title') }}</div>
            <div class="philosophy-desc">{{ t('landingPage.vs.philosophy.description') }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const photos = [
  { date: '3/15', color: '#f5f5f5' },
  { date: '3/16', color: '#e8e8e8' },
  { date: '3/18', color: '#f0f0f0' },
  { date: '3/20', color: '#e5e5e5' },
  { date: '3/22', color: '#f3f3f3' },
  { date: '3/25', color: '#eaeaea' },
];

const problems = ref<string[]>([]);
const goods = ref<string[]>([]);
const beforeProblems = ref<string[]>([]);

const loadArrays = () => {
  problems.value = [
    t('landingPage.vs.before.issues.0'),
    t('landingPage.vs.before.issues.1'),
    t('landingPage.vs.before.issues.2'),
  ];
  goods.value = [
    t('landingPage.vs.after.benefits.0'),
    t('landingPage.vs.after.benefits.1'),
    t('landingPage.vs.after.benefits.2'),
  ];
  beforeProblems.value = [
    t('landingPage.vs.before.problems.0'),
    t('landingPage.vs.before.problems.1'),
    t('landingPage.vs.before.problems.2'),
  ];
};

loadArrays();

watch(locale, () => {
  loadArrays();
});
</script>

<style scoped>
.vs-section {
  background: var(--bg2);
}

.vs-killer-line {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink2);
  font-style: italic;
  margin-top: 6px;
}

.vs-grid {
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  gap: 0;
  margin-top: 56px;
  align-items: start;
}

.vs-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Column headers */
.vs-col-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border);
  margin-bottom: 4px;
}

.bad-header {
  border-bottom-color: var(--red);
}

.good-header {
  border-bottom-color: var(--green);
}

.vs-x {
  font-size: 18px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--red-bg);
  color: var(--red);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex-shrink: 0;
}

.vs-check {
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--green-bg);
  color: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex-shrink: 0;
}

.vs-col-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--ink);
}

.vs-col-sub {
  font-size: 14px;
  color: var(--muted);
  font-family: var(--mono);
  margin-top: 1px;
}

/* Album mockup */
.album-mock {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.album-question {
  padding: 16px;
  background: #fef3c7;
  border-bottom: 1px solid #fbbf24;
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-avatar {
  font-size: 24px;
}

.question-text {
  font-size: 14px;
  color: #92400e;
  font-weight: 600;
}

.album-header {
  background: #f5f5f5;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.album-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.album-dates {
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.album-date-item {
  font-size: 14px;
  color: var(--ink2);
  font-family: var(--mono);
  padding: 6px 12px;
  background: var(--bg2);
  border-radius: 6px;
}

.album-problems {
  padding: 16px;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.album-problem {
  font-size: 13px;
  color: #991b1b;
  line-height: 1.5;
  padding-left: 12px;
  border-left: 3px solid #dc2626;
}

/* SiteNear mockup */
.SiteNear-mock {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.SiteNear-header {
  background: var(--brand);
  padding: 12px 16px;
  border-bottom: 1px solid var(--brand-border);
}

.SiteNear-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.SiteNear-list {
  padding: 12px;
}

.SiteNear-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg2);
  border-radius: 8px;
  margin-bottom: 8px;
}

.SiteNear-icon {
  font-size: 20px;
}

.SiteNear-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.SiteNear-task {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.SiteNear-status {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  height: 24px;
  width: 24px;
}

.status-check {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: #22c55e;
}

.SiteNear-pending {
  /* No background, just the icon */
}

.SiteNear-done {
  /* No background, handled by status-check */
}

.SiteNear-result {
  padding: 12px 16px;
  background: var(--green-bg);
  border-top: 1px solid #bbf7d0;
  text-align: center;
}

.SiteNear-success {
  font-size: 14px;
  color: var(--green);
  font-weight: 700;
}

/* VS Problems list */
.vs-problems {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vs-problem-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: var(--ink3);
  padding: 8px 12px;
  background: var(--red-bg);
  border-radius: 6px;
  border: 1px solid var(--red-border);
}

.vpi-x {
  color: var(--red);
  font-weight: 900;
  flex-shrink: 0;
  font-size: 14px;
  margin-top: 1px;
}

/* VS Divider */
.vs-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 60px;
  gap: 0;
}

.vs-divider-line {
  width: 1px;
  height: 80px;
  background: var(--border);
}

.vs-divider-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

/* VS Goods list */
.vs-goods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vs-good-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: var(--ink3);
  padding: 8px 12px;
  background: var(--green-bg);
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.vgi-check {
  color: var(--green);
  font-weight: 900;
  flex-shrink: 0;
  font-size: 14px;
  margin-top: 1px;
}

/* Product philosophy */
.vs-philosophy {
  margin-top: 56px;
  text-align: center;
}

.philosophy-content {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  background: var(--brand-bg);
  border: 1.5px solid var(--brand-border);
  border-radius: 12px;
  padding: 20px 32px;
  max-width: 600px;
}

.philosophy-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.philosophy-text {
  text-align: left;
}

.philosophy-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--brand-text);
  margin-bottom: 4px;
}

.philosophy-desc {
  font-size: 15px;
  color: var(--ink2);
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 640px) {
  .vs-grid {
    grid-template-columns: 1fr;
  }

  .vs-divider {
    flex-direction: row;
    justify-content: center;
    padding-top: 0;
    padding: 12px 0;
  }

  .vs-divider-line {
    width: 80px;
    height: 1px;
  }

  .vs-section {
    padding: 64px 24px;
  }
}
</style>
