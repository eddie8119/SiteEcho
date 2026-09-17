<template>
  <div class="relative">
    <button
      class="hover:bg-brand-primary/10 flex items-center gap-1 rounded-lg p-1.5 text-sm text-gray-500 transition-colors hover:text-brand-primary"
      @click="openMembersDialog"
    >
      <img :src="AddPeopleIcon" class="h-4 w-4" alt="Add people" />
      <span class="hidden md:inline">{{ t('setting.inviteMember') }}</span>
    </button>

    <ProjectMembersDialog
      v-if="membersDialogVisible"
      v-model="membersDialogVisible"
      :project-id="projectId"
      :is-owner="resolvedIsOwner"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AddPeopleIcon from '@/assets/icons/AddPeople.png';
import ProjectMembersDialog from '@/components/project/ProjectMembersDialog.vue';

const props = defineProps<{
  projectTitle?: string;
  projectId: string;
  isOwner?: boolean;
}>();

const { t } = useI18n();

const membersDialogVisible = ref(false);

const resolvedIsOwner = computed(() => props.isOwner ?? true);

const openMembersDialog = () => {
  membersDialogVisible.value = true;
};
</script>
