<template>
  <ElCard class="panel-container">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div
            class="mb-1 mr-2 flex shrink-0 items-center justify-center rounded-full bg-brand-tertiary text-lg font-semibold text-primary-text"
            style="width: 50px; height: 50px"
          >
            {{ userInitial }}
          </div>
          <H1Title :title="userName ?? ''" />
        </div>

        <TextButton
          v-if="!isEditMode"
          class="px-6"
          variant="primary"
          size="md"
          @click="isEditMode = true"
        >
          {{ t('button.edit') }}
        </TextButton>
      </div>
    </template>

    <ElSkeleton :loading="isLoadingProfile" animated>
      <template #default>
        <div class="profile-info space-y-6">
          <div class="py-5">
            <!-- View Mode -->
            <ElDescriptions v-if="!isEditMode" :column="1" border>
              <ElDescriptionsItem v-for="item in userDetails" :key="item.key" :label="item.label">
                <div class="flex items-center">
                  <span>{{ item.value || '-' }}</span>
                </div>
              </ElDescriptionsItem>
            </ElDescriptions>

            <!-- Edit Mode -->
            <ProfileEditForm
              v-else
              :is-updating-profile="isUpdatingProfile"
              :user-email="userEmail"
              :edit-form-data="editFormData"
              :edit-form-errors="editFormErrors"
              @update:edit-form-data="editFormData = $event"
              @update:edit-form-errors="editFormErrors = $event"
              @cancel="cancelEdit"
              @save="handleSaveProfile"
            />
          </div>
        </div>
      </template>
    </ElSkeleton>
  </ElCard>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, onActivated, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';
import H1Title from '@/components/core/title/H1Title.vue';
import ProfileEditForm from '@/components/user/ProfileEditForm.vue';
import { useUser } from '@/composables/query/useUser';
import { logError } from '@/utils/logger';

const { t } = useI18n();
const { userProfile, isLoadingProfile, refetchProfile, updateProfile, isUpdatingProfile } =
  useUser();

const isEditMode = ref(false);
const editFormData = ref({
  name: '',
  phone: '',
  company: '',
});
const editFormErrors = ref<Record<string, string>>({
  name: '',
  phone: '',
  company: '',
});

type UserDoc = {
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  company?: string | null;
};

type UserProfile = {
  userDoc?: UserDoc | null;
};

const typedUserProfile = computed<UserProfile | null>(
  () => userProfile.value as UserProfile | null
);

const userName = computed(() => typedUserProfile.value?.userDoc?.name ?? null);
const userEmail = computed(() => typedUserProfile.value?.userDoc?.email ?? null);
const phoneNumber = computed(() => typedUserProfile.value?.userDoc?.phoneNumber ?? null);
const company = computed(() => typedUserProfile.value?.userDoc?.company ?? null);
const userInitial = computed(() => userName.value?.charAt(0)?.toUpperCase() || 'U');

const userDetails = computed(() => [
  { key: 'name', label: t('label.user.name'), value: userName.value },
  { key: 'email', label: t('label.user.email'), value: userEmail.value },
  { key: 'phone', label: t('label.user.phone'), value: phoneNumber.value },
  { key: 'company', label: t('label.user.company'), value: company.value },
]);

// Initialize edit form with current data
const initializeEditForm = () => {
  editFormData.value = {
    name: userName.value || '',
    phone: phoneNumber.value || '',
    company: company.value || '',
  };
  editFormErrors.value = {
    name: '',
    phone: '',
    company: '',
  };
};

const handleSaveProfile = async () => {
  try {
    const { name, phone, company } = editFormData.value;
    const { success, message } = await updateProfile({
      name,
      phone,
      company,
    });

    if (success) {
      ElMessage.success(t('message.success.update'));
      isEditMode.value = false;
    } else {
      ElMessage.error(message || t('message.error.update'));
    }
  } catch (err) {
    logError('Failed to update profile:', err, 'Profile');
    ElMessage.error(t('message.error.update'));
  }
};

// Cancel edit mode
const cancelEdit = () => {
  isEditMode.value = false;
  editFormErrors.value = {
    name: '',
    phone: '',
    company: '',
  };
};

// Watch for edit mode changes to initialize form
watch(isEditMode, (newVal: boolean) => {
  if (newVal) {
    initializeEditForm();
  }
});

// onActivated is called when a kept-alive component is re-inserted into the DOM.
// We refresh the data in the background without showing the loader.
onActivated(() => {
  // The onMounted hook handles the initial fetch, so we can skip the first activation.
  // This check prevents a double-fetch on the first load.
  if (!isLoadingProfile.value) {
    refetchProfile();
  }
});
</script>

<style scoped></style>
