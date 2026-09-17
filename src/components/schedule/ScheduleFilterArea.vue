<template>
  <div class="panel-container min-h-full space-y-4">
    <!-- Quick Actions -->
    <div class="flex justify-end gap-2">
      <TextButton variant="quick" size="sm" @click="$emit('select-all-filters')">
        <img src="@/assets/icons/Clear.svg" alt="Clear" class="mr-1 h-4 w-4" />
        {{ t('button.select_clear') }}
      </TextButton>
      <TextButton variant="quick" size="sm" @click="$emit('clear-filters')">
        <img src="@/assets/icons/Restore.svg" alt="Restore" class="mr-1 h-4 w-4" />
        {{ t('button.select_restore') }}
      </TextButton>
    </div>
    <!-- Project Filters -->
    <div>
      <Label :label="t('label.project.project') + t('label.filter') + ':'" />
      <div class="filter-group">
        <button
          v-for="p in projectTitleList"
          :key="p.id"
          type="button"
          :class="['normal-button', selectedProjectIds.includes(p.id) && 'is-active']"
          @click="$emit('toggle-project', p.id)"
        >
          {{ p.title }}
        </button>
      </div>
    </div>

    <!-- Construction Filters -->
    <div>
      <Label :label="t('label.construction') + t('label.filter') + ':'" />
      <div class="filter-group">
        <button
          v-for="c in constructionList"
          :key="c.id"
          type="button"
          :class="['normal-button', selectedConstructionIds.includes(c.id) && 'is-active']"
          @click="$emit('toggle-construction', c.id)"
        >
          {{ c.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { ConstructionSelection } from '@/types/selection';

import TextButton from '@/components/core/button/TextButton.vue';
import Label from '@/components/core/title/Label.vue';

defineProps<{
  constructionList: ConstructionSelection[];
  projectTitleList: Array<{ id: string; title: string }>;
  selectedConstructionIds: string[];
  selectedProjectIds: string[];
}>();

defineEmits<{
  'toggle-construction': [id: string];
  'toggle-project': [id: string];
  'select-all-filters': [];
  'clear-filters': [];
}>();

const { t } = useI18n();
</script>

<style scoped>
.filter-group {
  @apply mt-2 flex flex-wrap gap-2;
}
</style>
