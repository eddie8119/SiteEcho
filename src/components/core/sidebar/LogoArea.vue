<template>
  <router-link to="/desktop/overview" class="logo-link">
    <div
      class="flex items-center justify-center gap-2 transition-all duration-200 md:gap-4"
      :class="{ 'logo-pill': props.isSidebarCollapsed }"
    >
      <img
        v-if="props.isSidebarCollapsed"
        src="@/assets/icons/CompanyLogo.png"
        :alt="`Funsugar Logo`"
        class="--desktop h-[38px] w-[33px]"
      />
      <img
        v-else
        src="@/assets/icons/CompanyLogo.png"
        :alt="`Funsugar Logo`"
        class="icon-logo --desktop h-[38px] w-[33px]"
      />
      <img
        v-if="!props.isSidebarCollapsed"
        src="@/assets/icons/SiteNearLogo.png"
        :alt="`SiteNear Logo`"
        class="icon-logo --desktop h-[30px] w-[86px]"
      />
    </div>
  </router-link>
</template>

<script setup lang="ts">
interface Props {
  isSidebarCollapsed: boolean;
}

const props = defineProps<Props>();
</script>

<style lang="scss" scoped>
.logo-link {
  display: flex;
  justify-content: center;
}

.logo-pill {
  gap: 0;
  padding: 0.2rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.7rem;
  background: linear-gradient(145deg, var(--color-brand-secondary), var(--color-brand-primary));
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.18);
}

.logo-pill img {
  width: 100%;
  height: auto;
  object-fit: contain;
}
</style>
