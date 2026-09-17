<template>
  <div class="store-buttons">
    <a
      v-for="store in stores"
      :key="store.name"
      :href="store.link"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img :src="store.icon" :alt="store.alt" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import AppleStoreIcon from '@/assets/icons/AppleStore.svg';
import { BRAND_LINK } from '@/constants/link';

const stores = computed(() => [
  {
    name: 'apple',
    link: BRAND_LINK.appleStore,
    icon: AppleStoreIcon,
    alt: 'Download on App Store',
  },
  // {
  //   name: 'google',
  //   link: BRAND_LINK.googleStore,
  //   icon: GoogleStoreIcon,
  //   alt: 'Get it on Google Play',
  // },
]);
</script>

<style scoped>
.store-buttons {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
}

img {
  width: 120px;
  height: auto;
  transition: transform 0.15s;
}

a:hover img {
  transform: scale(1.05);
}
</style>
