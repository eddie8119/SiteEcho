import { Capacitor } from '@capacitor/core';
import { computed, ref, type Ref, unref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { BillingPlatform, CurrencyCode } from '@/config/planConfig';
import type { PricingMenuPlan } from '@/types/billing';
import type { StoreKitProductMap } from '@/types/billing';

import { APPLE_IAP_PRODUCT_IDS, PRICING_MATRIX } from '@/config/planConfig';

const getDefaultCurrency = (): CurrencyCode => {
  if (typeof window !== 'undefined') {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language;
    if (tz?.includes('Taipei') || lang?.toLowerCase().includes('tw')) {
      return 'TWD';
    }
  }
  return 'USD';
};

const formatPlanPeriod = (period?: { value: number; unit: 'day' | 'week' | 'month' | 'year' }) => {
  if (!period) return undefined;

  const unitLabelMap: Record<'day' | 'week' | 'month' | 'year', string> = {
    day: 'day',
    week: 'week',
    month: 'month',
    year: 'year',
  };

  return period.value > 1
    ? `${period.value} ${unitLabelMap[period.unit]}`
    : unitLabelMap[period.unit];
};

export const usePricingPlans = (
  initialCurrency?: CurrencyCode,
  overridePlatform?: BillingPlatform | Ref<BillingPlatform>,
  storeKitProducts?: Ref<StoreKitProductMap | undefined>
) => {
  const { t } = useI18n();
  const currency = ref<CurrencyCode>(initialCurrency || getDefaultCurrency());

  // Auto-detect platform: Native iOS uses 'app_iap', web and other native platforms use 'web'
  const platform = computed<BillingPlatform>(() => {
    const resolvedPlatform = overridePlatform ? unref(overridePlatform) : undefined;
    if (resolvedPlatform) return resolvedPlatform;
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' ? 'app_iap' : 'web';
  });

  const priceInfo = computed(() => PRICING_MATRIX[platform.value][currency.value]);

  const monthlyStoreKitProduct = computed(
    () => storeKitProducts?.value?.[APPLE_IAP_PRODUCT_IDS.MONTHLY]
  );
  const yearlyStoreKitProduct = computed(
    () => storeKitProducts?.value?.[APPLE_IAP_PRODUCT_IDS.YEARLY]
  );

  const isEligibleForIntroOffer = computed(() => {
    if (platform.value !== 'app_iap') return false;
    return monthlyStoreKitProduct.value?.isEligibleForIntroOffer || false;
  });

  const plans = computed<PricingMenuPlan[]>(() => [
    {
      id: 'free',
      title: 'Free',
      currencySymbol: priceInfo.value.currencySymbol,
      price: '0',
      currency: priceInfo.value.currency,
      borderClass: 'border-2 border-gray-300 dark:border-gray-600',
      titleClass: 'text-gray-700 dark:text-gray-300',
      buttonClass: 'bg-gray-500 hover:bg-gray-600 focus-visible:ring-gray-400',
      checkClass: 'text-gray-500',
      buttonText: t('billing.plans.free.buttonText'),
      features: [
        t('billing.plans.free.features.unlimitedPhotos'),
        t('billing.plans.free.features.organization'),
        t('billing.plans.free.features.cloudBackup'),
      ],
      platform: platform.value,
    },
    {
      id: 'pro',
      title: 'Pro',
      currencySymbol: priceInfo.value.currencySymbol,
      price: priceInfo.value.monthlyPrice,
      currency: priceInfo.value.currency,
      borderClass: 'border-2 border-brand-primary dark:border-brand-primary',
      titleClass: 'text-brand-primary dark:text-brand-primary',
      buttonClass: 'bg-brand-primary hover:bg-brand-primary focus-visible:ring-brand-primary',
      checkClass: 'text-brand-primary',
      buttonText: t('billing.plans.pro.buttonText'),
      annualPrice: priceInfo.value.yearlyPrice,
      annualMonthlyPrice: priceInfo.value.monthlyInYearly,
      annualSavings: priceInfo.value.yearlySavingsPercent,
      productIdMonthly: priceInfo.value.productIdMonthly,
      productIdYearly: priceInfo.value.productIdYearly,
      paddlePriceIdMonthly: priceInfo.value.paddlePriceIdMonthly,
      paddlePriceIdYearly: priceInfo.value.paddlePriceIdYearly,
      platform: platform.value,
      hasFreeTrial: priceInfo.value.hasFreeTrial,
      trialDays: priceInfo.value.trialDays,
      badgeText:
        platform.value === 'app_iap'
          ? t('billing.plans.pro.badgeText.appIap')
          : t('billing.plans.pro.badgeText.web'),
      nativePriceLabel:
        platform.value === 'app_iap' ? monthlyStoreKitProduct.value?.displayPrice : undefined,
      nativePricePeriod:
        platform.value === 'app_iap' ? monthlyStoreKitProduct.value?.subscriptionPeriod : undefined,
      nativeAnnualPriceLabel:
        platform.value === 'app_iap' ? yearlyStoreKitProduct.value?.displayPrice : undefined,
      nativeAnnualPricePeriod:
        platform.value === 'app_iap' ? yearlyStoreKitProduct.value?.subscriptionPeriod : undefined,
      isEligibleForIntroOffer: isEligibleForIntroOffer.value,
      features: [
        t('billing.plans.pro.features.reports'),
        t('billing.plans.pro.features.webEdit'),
        t('billing.plans.pro.features.cloudBackup'),
      ],
    },
  ]);

  return {
    plans,
    currency,
    platform,
    priceInfo,
    monthlyStoreKitProduct,
    yearlyStoreKitProduct,
    isEligibleForIntroOffer,
    formatPlanPeriod,
  };
};
