<template>
  <AuthBackground>
    <AuthCard :show-logo="false" :show-submit-button="false">
      <template #title>{{ currentTitle }}</template>

      <div class="space-y-8 text-center">
        <p class="text-base text-gray-500">
          {{ currentMessage }}
        </p>

        <div class="flex flex-col items-center gap-8">
          <div
            class="relative flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-gray-200 bg-white"
          >
            <div
              class="flex h-20 w-20 items-center justify-center rounded-full"
              :class="statusClasses"
            >
              <svg
                v-if="isLoading"
                class="h-8 w-8 animate-spin text-brand-primary"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <img v-else-if="success" :src="check" alt="check" class="h-12 w-12 object-contain" />
              <img v-else :src="close" alt="close" class="h-12 w-12 object-contain" />
            </div>
            <div
              v-if="isLoading"
              class="bg-brand-primary/10 absolute inset-0 animate-pulse rounded-full"
            />
          </div>

          <div class="w-full space-y-4">
            <p v-if="error" class="rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-600">
              {{ error }}
            </p>
            <p v-else-if="success" class="rounded-2xl bg-green-50 px-5 py-3 text-sm text-green-700">
              {{ t('message.sso_success') }}
            </p>
            <p v-else class="rounded-2xl bg-gray-50 px-5 py-3 text-sm text-gray-600">
              {{ t('message.sso_processing') }}
            </p>
          </div>

          <TextButton
            v-if="error"
            class="font-medium"
            size="md"
            variant="primary"
            full-width
            @click="redirectToLogin"
          >
            {{ t('button.back_to_login') }}
          </TextButton>
        </div>
      </div>
    </AuthCard>
  </AuthBackground>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import check from '@/assets/images/check.png';
import close from '@/assets/images/close.png';
import AuthBackground from '@/components/auth/AuthBackground.vue';
import AuthCard from '@/components/auth/AuthCard.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { getAuthService } from '@/services/auth';
import { detectDevice } from '@/utils/deviceDetector';
import { logError, logWarn } from '@/utils/logger';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { syncPhotos, isSyncing, syncProgress } = useRegistrationFlow();

const isLoading = ref(true);
const error = ref<string | null>(null);
const success = ref(false);

const redirectToLogin = () => {
  router.replace('/auth/login');
};

const statusClasses = computed(() => {
  if (success.value) {
    return 'bg-green-50 text-green-600';
  }
  if (error.value) {
    return 'bg-red-50 text-red-500';
  }
  return 'bg-brand-primary/10 text-brand-primary';
});

const currentTitle = computed(() => {
  if (success.value) {
    return t('title.sso_success');
  }
  if (error.value) {
    return t('title.sso_error');
  }
  return t('title.sso_processing');
});

const currentMessage = computed(() => {
  if (success.value) {
    return t('message.sso_success');
  }
  if (error.value) {
    return error.value;
  }
  if (isSyncing.value) {
    if (syncProgress.value.total > 0) {
      return t('message.sync_progress', {
        synced: syncProgress.value.synced,
        total: syncProgress.value.total,
      });
    }
    return t('message.syncing_cloud_data');
  }
  return t('message.sso_processing');
});

const handleSsoCallback = async () => {
  const isNative = Capacitor.isNativePlatform();

  // 先檢查 query 與 hash，支援 code 與 token 兩種回調格式
  const url = new URL(window.location.href);
  const urlParams = url.searchParams;
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);

  const code = urlParams.get('code') || hashParams.get('code');

  // Web/PWA 流程：直接用 Supabase exchange code 成 session
  if (code && !isNative) {
    const session = await getAuthService().exchangeOAuthCode(code);

    if (!session.refresh_token) {
      logWarn('OAuth session is missing refresh token', undefined, 'SsoCallback');
    }

    getAuthService().applySession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      role: 'user',
      source: 'supabase',
    });

    success.value = true;
    void syncPhotos(true).catch((syncError) => {
      logError('Background sync failed', syncError, 'SsoCallback');
    });
    setTimeout(() => {
      const redirectParam = route.query.state;
      let redirectTo: string | { name: string };

      if (typeof redirectParam === 'string' && redirectParam.length > 0) {
        redirectTo = redirectParam;
      } else {
        const device = detectDevice();
        if (device.isMobile || device.isTablet) {
          redirectTo = '/mobile/timeline';
        } else {
          redirectTo = { name: 'overview' };
        }
      }
      router.replace(redirectTo);
    }, 2000);

    return;
  }

  // 如果沒有 code，顯示錯誤
  error.value = t('message.sso.missing_params');
  isLoading.value = false;
};

onMounted(() => {
  handleSsoCallback();
});
</script>
