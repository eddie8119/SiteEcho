<template>
  <div class="spinner-overlay">
    <Loading />
  </div>
</template>

<script setup lang="ts">
import Loading from '@/components/core/loading/Loading.vue';
</script>

<style scoped>
.spinner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgb(0 0 0 / 40%); /* 半透明黑底 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.spinner-circle {
  width: 48px;
  height: 48px;
  border: 5px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  letter-spacing: 1px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
