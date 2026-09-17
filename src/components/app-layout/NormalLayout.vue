<template>
  <BaseTabLayout
    :subject="subjectLabel"
    :subtitle="subtitleLabel"
    :tabs-list="tabsList"
    :tab-component="Tab"
  >
    <router-view class="mt-4" />
  </BaseTabLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Tab as TabType } from '@/types/layout';

import BaseTabLayout from '@/components/app-layout/BaseTabLayout.vue';
import Tab from '@/components/core/tab/Tab.vue';
import { useCollaboratorInfo } from '@/composables/query/useCollaboratorInfo';
import { COLLABORATOR_TAB_LIST, SETTING_COMMON_TAB_LIST, USER_TAB_LIST } from '@/constants/tab';

const props = defineProps<{
  subject: string;
  title?: string;
  subtitle?: string;
}>();

const { isCollaborator } = useCollaboratorInfo();

// switch 語句在未來擴展時會變得很臃腫，可以改用一個物件映射來處理。
const tabListMap = computed<Record<string, TabType[]>>(() => ({
  user: isCollaborator.value ? COLLABORATOR_TAB_LIST : USER_TAB_LIST,
  settingCommon: SETTING_COMMON_TAB_LIST,
}));

const tabsList = computed(() => tabListMap.value[props.subject] ?? []);

const { t } = useI18n();

const subjectLabel = computed(() => t(`title.${props.subject}`));
const subtitleLabel = computed(() =>
  props.subtitle ? t(`subtitle.${props.subtitle}`) : undefined
);
</script>

<style scoped></style>
