<template>
  <SlideBase :visible="isQuickDraftSlideVisible" @close="hideQuickDraftSlide">
    <QuickDraft />
  </SlideBase>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';

import QuickDraft from '@/components/core/draft/QuickDraft.vue';
import SlideBase from '@/components/core/slide/SlideBase.vue';
import { useSlideStore } from '@/stores/useSlideStore';

const slideStore = useSlideStore();
const { isQuickDraftSlideVisible } = storeToRefs(slideStore);
const { hideQuickDraftSlide } = slideStore;
</script>
