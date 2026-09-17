<template>
  <aside
    class="sidebar-container border-right flex flex-col"
    :class="props.isSidebarCollapsed ? 'w-18 items-center' : 'w-60'"
  >
    <LogoArea :is-sidebar-collapsed="props.isSidebarCollapsed" />
    <div class="mt-5 flex-1">
      <NavBar :is-sidebar-collapsed="props.isSidebarCollapsed" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import LogoArea from './LogoArea.vue';
import NavBar from './NavBar.vue';

interface Props {
  isSidebarCollapsed: boolean;
}

const props = defineProps<Props>();
</script>

<style lang="scss" scoped></style>
