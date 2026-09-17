<template>
  <main class="panel-color-difference relative h-screen w-full overflow-hidden md:bg-transparent">
    <!-- Back Button (top-left) -->
    <button
      class="safe-area-top-sm absolute left-4 top-4 z-50 rounded-lg p-2 hover:bg-orange-100"
      @click="handleBack"
    >
      <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <!-- Background (desktop only) -->
    <div class="absolute inset-0 hidden bg-cover bg-center md:block" :style="backgroundStyle" />
    <div
      class="from-black/65 via-black/45 to-black/30 absolute inset-0 hidden bg-gradient-to-br backdrop-blur-[1.5px] md:block"
      aria-hidden="true"
    />

    <!-- Content -->
    <section class="relative flex h-screen items-center justify-center px-4 py-6 md:px-0 md:py-0">
      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

interface Props {
  imageSrc?: string;
}

const props = withDefaults(defineProps<Props>(), {
  imageSrc: '/images/Background.png',
});

const router = useRouter();

const backgroundStyle = computed(() => ({
  backgroundImage: `url('${props.imageSrc}')`,
  filter: 'saturate(50%)',
}));

const handleBack = () => {
  router.back();
};
</script>
