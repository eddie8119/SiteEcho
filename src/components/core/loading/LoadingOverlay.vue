<template>
  <Teleport v-if="show" to="body">
    <div class="loading-overlay" role="status" aria-live="assertive">
      <div class="spinner" />
      <div class="text-panel">
        <p class="headline">{{ message }}</p>
        <p v-if="subtext" class="subtext">{{ subtext }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  message?: string;
  subtext?: string;
}

withDefaults(defineProps<Props>(), {
  show: false,
  message: 'Loading...',
  subtext: undefined,
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(2px);
  color: #111827;
  z-index: 2200;
}

.spinner {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 5px solid rgba(75, 85, 99, 0.35);
  border-top-color: #4b5563;
  animation: spin 1s linear infinite;
}

.text-panel {
  text-align: center;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  min-width: 220px;
}

.headline {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.subtext {
  margin-top: 0.25rem;
  font-size: 0.9rem;
  color: #374151;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
