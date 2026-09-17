import { onMounted, onUnmounted, ref } from 'vue';

import { formatCameraDateTime } from '@/utils/date';

export function useCameraDateTime() {
  const currentTime = ref('');
  const timePeriod = ref('');
  const currentDate = ref('');
  const currentDay = ref('');
  const timeInterval = ref<number | null>(null);

  const updateDateTime = () => {
    const now = new Date();
    const formatted = formatCameraDateTime(now);
    currentTime.value = formatted.time;
    timePeriod.value = formatted.timePeriod;
    currentDate.value = formatted.date;
    currentDay.value = formatted.day;
  };

  onMounted(() => {
    updateDateTime();
    timeInterval.value = window.setInterval(updateDateTime, 1000);
  });

  onUnmounted(() => {
    if (timeInterval.value !== null) {
      clearInterval(timeInterval.value);
    }
  });

  return {
    currentTime,
    timePeriod,
    currentDate,
    currentDay,
  };
}
