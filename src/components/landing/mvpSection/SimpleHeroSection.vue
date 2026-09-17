<template>
  <section :class="customClass">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <h1
          class="mb-4 text-3xl font-black leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl"
        >
          {{ title }}
        </h1>
        <p class="text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg lg:text-xl">
          {{ subtitle }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  subtitle: string;
  customClass?: string;
}

defineProps<Props>();
</script>
