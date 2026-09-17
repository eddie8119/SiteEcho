<template>
  <div class="space-y-4">
    <!-- Name Field -->
    <div>
      <label class="mb-2 block text-sm font-medium">{{ t('label.user.name') }}</label>
      <FormInput
        :model-value="editFormData.name"
        name="name"
        type="text"
        :placeholder="t('placeholder.auth.name')"
        :error="editFormErrors.name"
        :disabled="isUpdatingProfile"
        icon="User"
        @update:model-value="emit('update:edit-form-data', { ...editFormData, name: $event })"
      />
      <div v-if="editFormErrors.name" class="mt-1 text-sm text-secondary-red">
        {{ editFormErrors.name }}
      </div>
    </div>

    <!-- Email Field (Read-only) -->
    <div>
      <label class="mb-2 block text-sm font-medium">{{ t('label.user.email') }}</label>
      <FormInput
        :model-value="userEmail || ''"
        name="email"
        type="email"
        :placeholder="t('placeholder.auth.email')"
        disabled
        icon="Message"
      />
    </div>

    <!-- Phone Field -->
    <div>
      <label class="mb-2 block text-sm font-medium">{{ t('label.user.phone') }}</label>
      <FormInput
        :model-value="editFormData.phone"
        name="phone"
        type="text"
        :placeholder="t('placeholder.phone')"
        :error="editFormErrors.phone"
        :disabled="isUpdatingProfile"
        icon="Phone"
        @update:model-value="emit('update:edit-form-data', { ...editFormData, phone: $event })"
      />
      <div v-if="editFormErrors.phone" class="mt-1 text-sm text-secondary-red">
        {{ editFormErrors.phone }}
      </div>
    </div>

    <!-- Company Field -->
    <div>
      <label class="mb-2 block text-sm font-medium">{{ t('label.user.company') }}</label>
      <FormInput
        :model-value="editFormData.company"
        name="company"
        type="text"
        :placeholder="t('placeholder.company')"
        :error="editFormErrors.company"
        :disabled="isUpdatingProfile"
        icon="OfficeBuilding"
        @update:model-value="emit('update:edit-form-data', { ...editFormData, company: $event })"
      />
      <div v-if="editFormErrors.company" class="mt-1 text-sm text-secondary-red">
        {{ editFormErrors.company }}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-end gap-2 pt-4">
      <TextButton size="md" variant="outline" :disabled="isUpdatingProfile" @click="cancelEdit">
        {{ t('button.cancel') }}
      </TextButton>
      <TextButton
        size="md"
        variant="primary"
        :disabled="isUpdatingProfile"
        :loading="isUpdatingProfile"
        @click="handleSaveProfile"
      >
        {{ t('button.save') }}
      </TextButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { EditProfileData } from '@/types/user';

import TextButton from '@/components/core/button/TextButton.vue';
import FormInput from '@/components/core/input/FormInput.vue';
import { editProfileSchema } from '@/utils/schemas/editProfile';

interface Props {
  isUpdatingProfile: boolean;
  userEmail: string | null;
  editFormData: EditProfileData;
  editFormErrors: Record<string, string>;
}

interface Emits {
  (e: 'update:edit-form-data', value: EditProfileData): void;
  (e: 'update:edit-form-errors', value: Record<string, string>): void;
  (e: 'cancel'): void;
  (e: 'save'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

// Validate form using editProfileSchema
const validateForm = (): boolean => {
  const errors: Record<string, string> = {
    name: '',
    phone: '',
    company: '',
  };

  try {
    const schema = editProfileSchema(t);
    schema.parse(props.editFormData);
    emit('update:edit-form-errors', errors);
    return true;
  } catch (error: unknown) {
    const zodError = error as { errors?: Array<{ path: string[]; message: string }> };
    if (zodError.errors) {
      zodError.errors.forEach((err) => {
        const path = err.path[0];
        if (path) {
          errors[path] = err.message;
        }
      });
    }
    emit('update:edit-form-errors', errors);
    return false;
  }
};

// Save profile changes
const handleSaveProfile = async () => {
  if (!validateForm()) {
    return;
  }
  emit('save');
};

// Cancel edit mode
const cancelEdit = () => {
  emit('cancel');
};
</script>

<style scoped></style>
