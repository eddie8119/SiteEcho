import { ref } from 'vue';

export const usePlanFeedback = () => {
  const loadingPlanId = ref<string | null>(null);
  const warningMessage = ref<string | null>(null);
  const toastMessage = ref<string | null>(null);
  const toastVariant = ref<'success' | 'error' | 'info'>('info');

  const clearWarning = () => {
    warningMessage.value = null;
  };

  const setWarning = (message: string | null) => {
    warningMessage.value = message;
  };

  const showToast = (message: string, variant: 'success' | 'error' | 'info') => {
    toastMessage.value = message;
    toastVariant.value = variant;
  };

  const clearToast = () => {
    toastMessage.value = null;
  };

  const setLoading = (planId: string | null) => {
    loadingPlanId.value = planId;
  };

  return {
    loadingPlanId,
    warningMessage,
    toastMessage,
    toastVariant,
    clearWarning,
    setWarning,
    showToast,
    clearToast,
    setLoading,
  };
};

export type UsePlanFeedbackReturn = ReturnType<typeof usePlanFeedback>;
