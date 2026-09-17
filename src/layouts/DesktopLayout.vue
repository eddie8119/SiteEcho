<template>
  <div class="app-layout-shell background-color-difference flex h-screen">
    <!-- Sidebar -->
    <Sidebar :is-sidebar-collapsed="isSidebarCollapsed" class="--desktop hidden md:block" />

    <!-- Main Content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <Header :is-sidebar-collapsed="isSidebarCollapsed" @toggle-sidebar="toggleSidebar" />

      <GoLiveBanner />

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">
        <router-view v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import Header from '@/components/core/header/Header.vue';
import Sidebar from '@/components/core/sidebar/Sidebar.vue';
import GoLiveBanner from '@/components/subscription/GoLiveBanner.vue';

const isSidebarCollapsed = ref(true);

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};
</script>

<style scoped lang="scss"></style>

<!-- onMounted 都執行了 是不是就不用寫 watch -->
<!-- 全域 layout 組件，通常只會被掛載一次  只有第一次進入 app 時會判斷一次 後續onMounted 不會再執行-->
