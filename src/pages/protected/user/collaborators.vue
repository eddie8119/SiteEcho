<template>
  <div class="space-y-6">
    <!-- Add Global Collaborator Section -->
    <ElCard class="panel-container">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ t('collaborator.addGlobalCollaborator') }}</h2>
        </div>
      </template>

      <ElForm :model="formData" label-width="120px" @submit.prevent="handleAddCollaborator">
        <ElFormItem :label="t('collaborator.email')" prop="collaboratorEmail">
          <ElInput
            v-model="formData.collaboratorEmail"
            :placeholder="t('collaborator.emailPlaceholder')"
            type="email"
          />
        </ElFormItem>

        <ElFormItem :label="t('collaborator.role')" prop="role">
          <ElSelect v-model="formData.role" :placeholder="t('collaborator.selectRole')">
            <ElOption
              v-for="option in COLLABORATOR_ROLE_OPTIONS"
              :key="option.value"
              :label="t(`option.role.${option.value}`)"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem>
          <ElButton type="primary" :loading="isAdding" @click="handleAddCollaborator">
            {{ t('button.add') }}
          </ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- Global Collaborators List -->
    <ElCard class="panel-container">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ t('collaborator.globalCollaborators') }}</h2>
        </div>
      </template>

      <ElSkeleton :loading="isLoadingGlobalCollaborators" animated>
        <template #default>
          <ElTable
            v-if="globalCollaborators.length > 0"
            :data="globalCollaborators"
            stripe
            style="width: 100%"
          >
            <ElTableColumn prop="collaboratorEmail" :label="t('collaborator.email')" />
            <ElTableColumn prop="collaboratorName" :label="t('collaborator.name')" />
            <ElTableColumn prop="role" :label="t('collaborator.role')" />
            <ElTableColumn :label="t('common.actions')" width="150">
              <template #default="{ row }">
                <ElButton
                  link
                  type="danger"
                  size="small"
                  :loading="isRemoving"
                  @click="handleRemoveCollaborator(row.id)"
                >
                  {{ t('button.remove') }}
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
          <div v-else class="py-8 text-center text-gray-500">
            {{ t('collaborator.noCollaborators') }}
          </div>
        </template>
      </ElSkeleton>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
} from 'element-plus';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { CollaboratorRole } from '@/types/response';

import { useGlobalCollaborators } from '@/composables/query/useCollaborators';
import { COLLABORATOR_ROLE_OPTIONS } from '@/constants/selection';

const { t } = useI18n();

const formData = ref({
  collaboratorEmail: '',
  role: 'viewer',
});

const {
  collaborators,
  isLoadingGlobalCollaborators,
  addCollaborator,
  removeCollaborator,
  isAdding,
  isRemoving,
  refetchGlobalCollaborators,
} = useGlobalCollaborators();

const globalCollaborators = computed(() => collaborators?.value ?? []);

const handleAddCollaborator = async () => {
  if (!formData.value.collaboratorEmail) {
    return;
  }

  await addCollaborator({
    collaboratorEmail: formData.value.collaboratorEmail,
    role: formData.value.role as CollaboratorRole,
  });
  formData.value.collaboratorEmail = '';
  formData.value.role = 'viewer';
  await refetchGlobalCollaborators();
};

const handleRemoveCollaborator = async (collaboratorId: string) => {
  await removeCollaborator(collaboratorId);
  await refetchGlobalCollaborators();
};
</script>

<style scoped></style>
