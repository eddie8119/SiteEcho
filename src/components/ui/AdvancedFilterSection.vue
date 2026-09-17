<template>
  <div class="mt-2">
    <HideButton
      class="toggle-button gap-1"
      :label="isOpen ? t('button.advanced_filter.hide') : t('button.advanced_filter.show')"
      :is-open="isOpen"
      @click="isOpen = !isOpen"
    />
    <ElCollapseTransition>
      <div v-show="isOpen" class="mt-3">
        <slot />
      </div>
    </ElCollapseTransition>
  </div>
</template>

<script setup lang="ts">
import { ElCollapseTransition } from 'element-plus';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import HideButton from '@/components/core/button/HideButton.vue';

const props = withDefaults(
  defineProps<{
    defaultOpen?: boolean;
  }>(),
  { defaultOpen: false }
);

const { t } = useI18n();
const isOpen = ref<boolean>(props.defaultOpen);
</script>

<style scoped></style>
