<template>
  <div class="relative space-y-6">
    <hr class="my-6 border-gray-200" />
    <section>
      <div class="space-y-3">
        <TextButton
          v-for="action in authActions"
          :key="action.key"
          variant="primary"
          size="md"
          full-width
          type="button"
          @click="action.onClick"
        >
          {{ action.label }}
        </TextButton>
        <div class="text-right">
          <a
            :href="notionManualLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-600 underline hover:text-brand-primary"
          >
            {{ t('setting.user_manual') }}
          </a>
        </div>
      </div>
    </section>

    <hr class="my-6 border-gray-200" />

    <section>
      <H2Title :title="t('title.storage_space')" />
      <StorageUsage is-compact class="!p-2" />
      <TextButton
        variant="ghost"
        size="md"
        full-width
        class="py mt-4 border-gray-300 text-gray-800 hover:bg-gray-50"
        type="button"
        @click="router.push('/mobile/trash')"
      >
        {{ t('setting.trash') }}
      </TextButton>
    </section>

    <hr class="my-6 border-gray-200" />

    <section>
      <H2Title :title="t('common.language')" />
      <div class="space-y-3">
        <ElSelect
          v-model="selectedLanguage"
          :placeholder="t('placeholder.project.please_select_language')"
          @change="handleLanguageSelect"
        >
          <ElOption
            v-for="lang in languages"
            :key="lang.code"
            :label="lang.label"
            :value="lang.code"
          />
        </ElSelect>
      </div>
    </section>

    <hr class="my-6 border-gray-200" />

    <section>
      <H2Title :title="t('title.backup_restore')" />
      <div class="space-y-3">
        <TextButton
          v-for="action in backupActions"
          :key="action.key"
          variant="ghost"
          size="md"
          full-width
          class="py border-gray-300 text-gray-800 hover:bg-gray-50"
          type="button"
          :disabled="isExporting || isImporting"
          @click="action.onClick"
        >
          {{ action.label }}
        </TextButton>

        <p
          v-if="backupActions[1]?.key === BackupActionKey.IMPORT"
          class="text-right text-xs text-gray-500"
          style="margin-top: 0px"
        >
          ( {{ t('setting.backup.hint') }} )
        </p>

        <input
          ref="importInputRef"
          type="file"
          accept=".zip,application/zip"
          class="hidden"
          @change="handleImportBackup"
        />
      </div>
    </section>

    <hr class="my-6 border-gray-200" />

    <section>
      <div class="flex justify-end gap-4">
        <router-link
          v-for="link in policyLinks.filter((link) => !link.isExternal)"
          :key="link.to"
          :to="link.to"
          class="text-sm text-gray-600 underline hover:text-brand-primary"
        >
          {{ t(link.label) }}
        </router-link>
        <a
          v-for="link in policyLinks.filter((link) => link.isExternal)"
          :key="link.to"
          :href="link.to"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-gray-600 underline hover:text-brand-primary"
        >
          {{ t(link.label) }}
        </a>
      </div>
    </section>

    <!-- <ResearchAnalyticsPanel /> -->

    <ImportProgressDialog
      v-model="showImportProgress"
      :progress="importProgress"
      :processed="importProcessed"
      :total="importTotal"
    />

    <MobileToast
      v-if="showToast"
      :variant="toastVariant"
      :title="toastMessage"
      subtitle=""
      @close="showToast = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ElOption, ElSelect } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { BRAND_LINK } from '@/constants/link';
import StorageUsage from '@/components/billing/StorageUsage.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import H2Title from '@/components/core/title/H2Title.vue';
import MobileToast from '@/components/core/toast/MobileToast.vue';
import ImportProgressDialog from '@/components/setting/ImportProgressDialog.vue';
// import ResearchAnalyticsPanel from '@/components/setting/ResearchAnalyticsPanel.vue';
import { BackupActionKey, useBackupManager } from '@/composables/setting/useBackupManager';
import { useAuthentication } from '@/composables/useAuthentication';
import { useLocale } from '@/composables/useLocale';
import { useLocaleLink } from '@/composables/useLocaleLink';
import { useAuthStore } from '@/stores/useAuthStore';
import { Language } from '@/types/language';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const { logoutAction } = useAuthentication();
const { currentLanguage, languages, handleLanguageChange } = useLocale();
const { notionManualLink } = useLocaleLink();

const selectedLanguage = ref(currentLanguage.value);

// 為了解決 型別切換
const handleLanguageSelect = (code: string): void => {
  handleLanguageChange(code as Language);
};

const isAuthenticated = computed(() => authStore.isAuthenticated);

const goToLogin = () => {
  router.push('/auth/login');
};

const authActions = computed(() => [
  {
    key: isAuthenticated.value ? 'logout' : 'login',
    label: isAuthenticated.value ? t('button.logout') : t('button.login_register'),
    onClick: isAuthenticated.value ? logoutAction : goToLogin,
  },
]);

const policyLinks = computed(() => [
  { to: '/support', label: 'setting.support' },
  { to: BRAND_LINK.website, label: 'setting.website', isExternal: true },
  // { to: '/terms', label: 'setting.terms' },
]);

const {
  isExporting,
  exportSuccess,
  isImporting,
  importError,
  importSuccess,
  importInputRef,
  importProgress,
  importTotal,
  importProcessed,
  handleExportBackup,
  triggerImportBackup,
  handleImportBackup,
} = useBackupManager();

const showToast = ref(false);
const toastMessage = ref('');
const toastVariant = ref<'success' | 'error'>('success');
const showImportProgress = ref(false);

watch(isImporting, (newVal) => {
  showImportProgress.value = newVal;
});

const backupActions = computed(() => [
  {
    key: BackupActionKey.EXPORT,
    label: isExporting.value ? t('button.exporting') : t('button.export_backup'),
    onClick: handleExportBackup,
  },
  {
    key: BackupActionKey.IMPORT,
    label: isImporting.value ? t('button.importing') : t('button.import_backup'),
    onClick: triggerImportBackup,
  },
]);

// Show error message when import fails
watch(importError, (error) => {
  if (error) {
    toastMessage.value = error;
    toastVariant.value = 'error';
    showToast.value = true;
  }
});

// Show success message when import completes
watch(importSuccess, (success) => {
  if (success) {
    toastMessage.value = t('setting.backup.import_success');
    toastVariant.value = 'success';
    showToast.value = true;
  }
});

// Show success message when export completes
watch(exportSuccess, (success) => {
  if (success) {
    toastMessage.value = t('setting.backup.export_success');
    toastVariant.value = 'success';
    showToast.value = true;
  }
});
</script>
