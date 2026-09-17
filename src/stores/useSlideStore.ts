import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSlideStore = defineStore('slide', () => {
  // Quick Draft slide
  const isQuickDraftSlideVisible = ref(false);

  const toggleQuickDraftSlide = () => {
    isQuickDraftSlideVisible.value = !isQuickDraftSlideVisible.value;
  };
  const showQuickDraftSlide = () => {
    isQuickDraftSlideVisible.value = true;
  };
  const hideQuickDraftSlide = () => {
    isQuickDraftSlideVisible.value = false;
  };

  // Quick Plan slide
  const isQuickPlanSlideVisible = ref(false);

  const toggleQuickPlanSlide = () => {
    isQuickPlanSlideVisible.value = !isQuickPlanSlideVisible.value;
  };
  const showQuickPlanSlide = () => {
    isQuickPlanSlideVisible.value = true;
  };
  const hideQuickPlanSlide = () => {
    isQuickPlanSlideVisible.value = false;
  };

  // Notification slide
  const isNotificationSlideVisible = ref(false);

  const toggleNotificationSlide = () => {
    isNotificationSlideVisible.value = !isNotificationSlideVisible.value;
  };
  const showNotificationSlide = () => {
    isNotificationSlideVisible.value = true;
  };
  const hideNotificationSlide = () => {
    isNotificationSlideVisible.value = false;
  };

  return {
    // quick draft
    isQuickDraftSlideVisible,
    toggleQuickDraftSlide,
    showQuickDraftSlide,
    hideQuickDraftSlide,
    // quick plan
    isQuickPlanSlideVisible,
    toggleQuickPlanSlide,
    showQuickPlanSlide,
    hideQuickPlanSlide,
    // notification
    isNotificationSlideVisible,
    toggleNotificationSlide,
    showNotificationSlide,
    hideNotificationSlide,
  };
});
