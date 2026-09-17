<template>
  <div class="landing">
    <header class="hero">
      <div class="hero__content">
        <p class="hero__eyebrow">SiteNear · Interior Ops Platform</p>
        <h1>SiteNear | Interior Construction Management Software</h1>
        <p class="hero__subtitle">
          Capture site updates, coordinate trades, and publish reliable schedules from one
          collaborative workspace designed for interior renovation teams.
        </p>
        <div class="hero__cta">
          <RouterLink class="hero__button hero__button--primary" to="/auth/register">
            Create free workspace
          </RouterLink>
          <RouterLink class="hero__button" to="/auth/login"> View product tour </RouterLink>
        </div>
        <p class="hero__note">No credit card required · Multi-language interface</p>
      </div>
      <div class="hero__card">
        <div class="hero__badge">Live Gantt &amp; site log</div>
        <p class="hero__card-title">Every site, always in sync.</p>
        <ul>
          <li>Smart site diary with photo evidence</li>
          <li>Auto-reminders for upcoming milestones</li>
          <li>Invite designers, PMs, and contractors securely</li>
        </ul>
      </div>
    </header>

    <section class="features">
      <article v-for="feature in features" :key="feature.title" class="feature-card">
        <div class="feature-card__icon">{{ feature.icon }}</div>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.copy }}</p>
      </article>
    </section>

    <section class="stats">
      <article v-for="stat in stats" :key="stat.label" class="stat-card">
        <p class="stat-card__value">{{ stat.value }}</p>
        <p class="stat-card__label">{{ stat.label }}</p>
      </article>
    </section>

    <section class="cta">
      <div>
        <h2>Bring order to every renovation.</h2>
        <p>
          SiteNear centralizes drawings, schedules, RFIs, and punch lists so distributed teams can
          deliver spotless handovers.
        </p>
      </div>
      <RouterLink class="hero__button hero__button--primary" to="/auth/register">
        Launch SiteNear in English
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

const features = [
  {
    title: 'Live Site Timeline',
    copy: 'Visualize dependencies, crew assignments, and procurement windows on a responsive Gantt.',
    icon: '📅',
  },
  {
    title: 'Field Notes with Context',
    copy: 'Snap photos, tag rooms, and push updates to every collaborator without juggling chat apps.',
    icon: '📸',
  },
  {
    title: 'Governance-ready Workflows',
    copy: 'Role-based access, approval trails, and bilingual notifications keep teams compliant.',
    icon: '🛡️',
  },
];

const stats = [
  { value: '35%', label: 'Fewer missed tasks after week 2' },
  { value: '2X', label: 'Faster handover documentation' },
  { value: '12+', label: 'Projects managed per PM on average' },
];
</script>

<style scoped>
:global(body) {
  background-color: #05060a;
}

.landing {
  min-height: 100vh;
  padding: 4rem clamp(1.5rem, 4vw, 5rem) 5rem;
  color: #f5f6f7;
  background:
    radial-gradient(circle at top, rgba(255, 122, 0, 0.15), transparent 45%),
    linear-gradient(135deg, #05060a, #0d111a 60%, #111827);
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2.5rem;
  align-items: center;
}

.hero__eyebrow {
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #ffb347;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.hero h1 {
  font-size: clamp(2.5rem, 4vw, 3.75rem);
  line-height: 1.1;
  margin-bottom: 1rem;
}

.hero__subtitle {
  font-size: 1.1rem;
  color: #c6c9d2;
  max-width: 40ch;
}

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1.75rem 0 0.75rem;
}

.hero__button {
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: inherit;
  padding: 0.85rem 1.5rem;
  border-radius: 999px;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.hero__button--primary {
  background: linear-gradient(120deg, #ff7a00, #ffaa00);
  border: none;
  color: #05060a;
  box-shadow: 0 15px 35px rgba(255, 122, 0, 0.25);
}

.hero__button:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.1);
}

.hero__button--primary:hover {
  background: linear-gradient(120deg, #ffaa00, #ff7a00);
}

.hero__note {
  opacity: 0.7;
  font-size: 0.95rem;
}

.hero__card {
  padding: 2rem;
  border-radius: 1.25rem;
  background: rgba(16, 22, 34, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
}

.hero__badge {
  display: inline-flex;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-size: 0.85rem;
  color: #ffddbf;
  background: rgba(255, 122, 0, 0.1);
  margin-bottom: 0.9rem;
}

.hero__card-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.hero__card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: #c6c9d2;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  border-radius: 1.2rem;
  padding: 1.75rem;
  background: rgba(15, 20, 32, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.feature-card__icon {
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
}

.feature-card h3 {
  margin-bottom: 0.5rem;
}

.stat-card {
  text-align: center;
  padding: 1.75rem 1.25rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.stat-card__value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.stat-card__label {
  opacity: 0.85;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.cta {
  border-radius: 1.5rem;
  padding: 2.5rem;
  background: linear-gradient(120deg, rgba(255, 122, 0, 0.15), rgba(255, 255, 255, 0.07));
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

@media (max-width: 640px) {
  .landing {
    padding: 3rem 1.25rem 4rem;
  }

  .hero__button {
    width: 100%;
    text-align: center;
    justify-content: center;
  }
}
</style>
