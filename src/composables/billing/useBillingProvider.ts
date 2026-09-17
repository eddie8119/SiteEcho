import { Capacitor } from '@capacitor/core';
import { computed } from 'vue';

export type BillingProvider = 'apple' | 'google' | 'web';

export const useBillingProvider = () => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const provider = computed<BillingProvider>(() => {
    if (!isNative) {
      return 'web';
    }

    if (platform === 'ios') {
      return 'apple';
    }

    if (platform === 'android') {
      return 'google';
    }

    // Fallback for other native platforms
    return 'web';
  });

  const isApple = computed(() => provider.value === 'apple');
  const isGoogle = computed(() => provider.value === 'google');
  const isWeb = computed(() => provider.value === 'web');

  return {
    provider,
    isApple,
    isGoogle,
    isWeb,
  };
};
