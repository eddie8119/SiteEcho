<template>
  <NormalLayout :subject="'setting_common'" :subtitle="'setting_common'">
    <router-view />
  </NormalLayout>
</template>

<script setup lang="ts">
import NormalLayout from '@/components/app-layout/NormalLayout.vue';
</script>

<style scoped></style>
