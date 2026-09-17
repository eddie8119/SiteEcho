<template>
  <div class="landing-layout">
    <Header @mobile-menu-toggle="handleMobileMenuToggle" />
    <main class="relative min-h-screen">
      <div
        v-if="isMobileMenuOpen"
        class="bg-black/30 absolute inset-0 z-10 backdrop-blur-md"
        @click="handleMobileMenuToggle"
      />
      <div :class="{ 'blur-sm': isMobileMenuOpen }">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import Header from '@/components/landing/Header.vue';
// import { trackEvent } from '@/utils/ga';

const isMobileMenuOpen = ref(false);

const handleMobileMenuToggle = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const sentMilestones = new Set<number>();

const handleScroll = () => {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const height = doc.scrollHeight - doc.clientHeight;
  if (height <= 0) return;
  const percent = Math.min(100, Math.round((scrollTop / height) * 100));
  [25, 50, 75, 100].forEach((m) => {
    if (percent >= m && !sentMilestones.has(m)) {
      sentMilestones.add(m);
      // trackEvent('scroll_depth', { section: 'landing', percent: m });
    }
  });
};

onMounted(() => {
  // Enable document scrolling for landing page
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';

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

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  // Restore global overflow styles
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
});
</script>

<style scoped>
.landing-layout {
  min-height: 100vh;
}
</style>
