<template>
  <MobilePageLayout :title="t('title.deleteAccount')">
    <div class="space-y-6">
      <H1Title :title="t('title.deleteAccount')" />
      <div class="space-y-4">
        <p class="text-gray-700">
          {{ t('deleteAccount.description') }}
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('deleteAccount.steps.title') }}</h2>
        <p class="text-gray-700">{{ t('deleteAccount.steps.intro') }}</p>
        <ol class="ml-4 list-decimal space-y-2 text-gray-700">
          <li>{{ t('deleteAccount.steps.step1') }}</li>
          <li>{{ t('deleteAccount.steps.step2') }}</li>
          <li>{{ t('deleteAccount.steps.step3') }}</li>
          <li>{{ t('deleteAccount.steps.step4') }}</li>
          <li>{{ t('deleteAccount.steps.step5') }}</li>
        </ol>
        <p class="text-gray-700">
          {{ t('deleteAccount.steps.cannotLogin') }}
          <a :href="`mailto:${BRAND_LINK.email}`" class="text-brand-primary underline">
            {{ BRAND_LINK.email }}
          </a>
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ t('deleteAccount.dataHandling.title') }}
        </h2>
        <p class="text-gray-700">{{ t('deleteAccount.dataHandling.intro') }}</p>
        <ul class="ml-4 list-disc space-y-1 text-gray-700">
          <li>{{ t('deleteAccount.dataHandling.accountInfo') }}</li>
          <li>{{ t('deleteAccount.dataHandling.projectData') }}</li>
          <li>{{ t('deleteAccount.dataHandling.photosRecords') }}</li>
          <li>{{ t('deleteAccount.dataHandling.issueTracking') }}</li>
          <li>{{ t('deleteAccount.dataHandling.photoNotes') }}</li>
          <li>{{ t('deleteAccount.dataHandling.shareRecords') }}</li>
        </ul>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ t('deleteAccount.retention.title') }}
        </h2>
        <p class="text-gray-700">
          {{ t('deleteAccount.retention.description') }}
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('deleteAccount.notes.title') }}</h2>
        <ul class="ml-4 list-disc space-y-1 text-gray-700">
          <li>{{ t('deleteAccount.notes.note1') }}</li>
          <li>{{ t('deleteAccount.notes.note2') }}</li>
          <li>{{ t('deleteAccount.notes.note3') }}</li>
        </ul>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('deleteAccount.contact.title') }}</h2>
        <p class="text-gray-700">{{ t('deleteAccount.steps.contactSupport') }}</p>
        <p class="text-gray-700">
          {{ t('deleteAccount.contact.emailLabel')
          }}<a :href="`mailto:${BRAND_LINK.email}`" class="text-brand-primary underline">{{
            BRAND_LINK.email
          }}</a>
        </p>
      </div>

      <div class="space-y-4 pt-4">
        <div v-if="errorMessage" class="rounded-lg bg-red-50 p-4 text-red-700">
          {{ errorMessage }}
        </div>
        <button
          v-if="isAuthenticated"
          class="w-full rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700"
          @click="showDeleteDialog = true"
        >
          {{ t('button.deleteMyAccount') }}
        </button>
        <div v-else class="rounded-lg bg-gray-100 p-4 text-center">
          <p class="text-gray-700">{{ t('message.deleteAccount.loginRequired') }}</p>
          <button
            class="hover:bg-brand-primary/90 mt-2 rounded-lg bg-brand-primary px-4 py-2 font-medium text-white transition-colors"
            @click="router.push({ path: '/auth/login', query: { redirect: '/delete-account' } })"
          >
            {{ t('button.goToLogin') }}
          </button>
        </div>
      </div>
    </div>
  </MobilePageLayout>

  <DeleteDialog
    v-model="showDeleteDialog"
    :is-crucial="true"
    :target="userEmail"
    subject=""
    :body-text="t('message.deleteAccount.confirmBody')"
    :placeholder="t('deleteAccount.contact.emailLabel')"
    @confirm="handleDeleteAccount"
  />
</template>

<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import DeleteDialog from '@/components/core/dialog/DeleteDialog.vue';
import H1Title from '@/components/core/title/H1Title.vue';
import { useUser } from '@/composables/query/useUser';
import { BRAND_LINK } from '@/constants/link';
import MobilePageLayout from '@/layouts/MobilePageLayout.vue';
import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { clearAllDataFromIndexedDB } from '@/utils/indexedDB';
import { getCurrentUser } from '@/utils/user';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const queryClient = useQueryClient();
const { deleteAccount } = useUser();

const showDeleteDialog = ref(false);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const errorMessage = ref('');
const currentUser = computed(() => getCurrentUser());
const userEmail = computed(() => currentUser.value?.email || '');

const handleDeleteAccount = async () => {
  try {
    errorMessage.value = '';
    const result = await deleteAccount();
    if (result.success) {
      // 刪除本機 IndexedDB 資料（photos + projects）
      await clearAllDataFromIndexedDB();
      // 清除 Vue Query 快取
      queryClient.clear();
      // Auth user 已在後端刪除，僅清除本機 Supabase session，避免再次呼叫 global logout。
      await getAuthService().logout({ allDevices: false, revokeRemote: false });
      // 顯示成功訊息
      ElMessage.success(t('message.deleteAccount.deleteSuccess'));
      // 重定向到首頁
      router.push('/');
    } else {
      errorMessage.value = result.message || t('message.deleteAccount.deleteFailed');
      showDeleteDialog.value = false;
    }
  } catch (error) {
    console.error('Failed to delete account:', error);
    // 顯示錯誤訊息
    errorMessage.value = t('message.deleteAccount.deleteFailed');
    showDeleteDialog.value = false;
  }
};
</script>

<style scoped>
ol {
  list-style-type: decimal;
}

ul {
  list-style-type: disc;
}

li {
  list-style-type: inherit;
}
</style>
