import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { UseCurrentSubscriptionReturn } from './useCurrentSubscription';
import type { UsePlanFeedbackReturn } from './usePlanFeedback';
import type { UpgradeSubscriptionMode } from '@/types/billing';
import type { ApiResponse } from '@/types/request';

import { useUpgradePlan } from '@/composables/query/useBilling';
import { UPGRADE_SUBSCRIPTION_MODES } from '@/types/billing';

export const usePlanUpgrade = ({
  feedback,
  currentSubscription,
}: {
  feedback: UsePlanFeedbackReturn;
  currentSubscription: UseCurrentSubscriptionReturn;
}) => {
  const { t } = useI18n();
  const { upgradePlan, isUpgrading } = useUpgradePlan();
  const { refetchSubscription } = currentSubscription;

  const showUpgradeDialog = ref(false);
  const selectedPlanId = ref<string | null>(null);

  const resolveModeLabel = (mode: UpgradeSubscriptionMode) =>
    mode === UPGRADE_SUBSCRIPTION_MODES.IMMEDIATE
      ? t('billing.upgrade.modeLabelImmediate')
      : t('billing.upgrade.modeLabelNextRenewal');

  const upgrade = async (
    planId: string,
    mode: UpgradeSubscriptionMode
  ): Promise<{ url?: string }> => {
    const resp = await upgradePlan(planId, mode);
    const payload = resp.data as ApiResponse<{
      url?: string;
      upgraded?: boolean;
      message?: string;
    }>;
    let url: string | undefined;
    if ('data' in payload && payload.data) {
      url = payload.data.url;
    }
    return { url };
  };

  const openUpgradeDialog = (planId: string) => {
    selectedPlanId.value = planId;
    showUpgradeDialog.value = true;
  };

  const handleUpgradeSubscriptionMode = async (mode: UpgradeSubscriptionMode) => {
    if (!selectedPlanId.value) return;
    feedback.clearWarning();
    try {
      const { url } = await upgrade(selectedPlanId.value, mode);
      showUpgradeDialog.value = false;

      if (url) {
        window.location.href = url;
      } else {
        feedback.showToast(
          t('billing.upgrade.success', { modeLabel: resolveModeLabel(mode) }),
          'success'
        );

        if (refetchSubscription) {
          await refetchSubscription();
        }
        selectedPlanId.value = null;
      }
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      feedback.showToast(t('billing.upgrade.error'), 'error');
    }
  };

  return {
    showUpgradeDialog,
    selectedPlanId,
    isUpgrading,
    openUpgradeDialog,
    handleUpgradeSubscriptionMode,
  };
};

export type UsePlanUpgradeReturn = ReturnType<typeof usePlanUpgrade>;
