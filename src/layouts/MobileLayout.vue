<template>
  <div class="mobile-layout">
    <!-- Main Content -->
    <main>
      <router-view v-slot="{ Component }">
        <KeepAlive>
          <div class="">
            <component :is="Component" />
          </div>
        </KeepAlive>
      </router-view>
    </main>
    <BottomNavigation v-if="showBottomNavigation" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import BottomNavigation from '@/components/core/header/BottomNavigation.vue';

const route = useRoute();

const showBottomNavigation = computed(
  () =>
    route.name !== 'photo-edit' &&
    route.name !== 'mobile-setting' &&
    route.name !== 'mobile-change-password' &&
    route.name !== 'trash'
);
</script>

<style scoped lang="scss">
.mobile-layout {
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: 100vw;
  overflow: hidden;
  overscroll-behavior: none;
  display: flex;
  flex-direction: column;

  main {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
  }
}

// 移動端優化
@media (max-width: 768px) {
  .mobile-layout {
    font-size: 14px;
  }
}
</style>
