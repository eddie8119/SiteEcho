<template>
  <div class="flex flex-col items-center justify-center">
    <H2Title :title="titleToShow" class="mb-0 text-center" />
    <p v-if="description" class="text-color-difference">
      {{ description }}
    </p>
    <TextButton
      v-if="buttonTo && buttonLabel"
      variant="primary"
      size="md"
      class="mt-4 h-[30px] md:w-auto"
      @click="handleClick"
    >
      {{ buttonLabel }}
    </TextButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import TextButton from '@/components/core/button/TextButton.vue';
import H2Title from '@/components/core/title/H2Title.vue';

const props = defineProps<{
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonTo?: string;
}>();

const { t } = useI18n();
const router = useRouter();

const titleToShow = computed(() => props.title ?? t('message.no_tasks'));

const handleClick = () => {
  if (!props.buttonTo) return;
  router.push(props.buttonTo);
};
</script>
