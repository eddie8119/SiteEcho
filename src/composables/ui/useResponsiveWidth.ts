import { onBeforeUnmount, onMounted, readonly, ref } from 'vue';

export function useResponsiveWidth() {
  const breakpoint = 768;
  const isMobile = ref(false);
  const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);

  const updateIsMobile = () => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      viewportWidth.value = width;
      const isPortraitMobile = width < breakpoint;
      // 使用媒體查詢判斷觸控裝置與橫向
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      // 針對手機橫向：高度很小（例如 <= 480px）且為觸控裝置
      const isLandscapeMobile = isTouch && isLandscape && height <= 480;

      isMobile.value = isPortraitMobile || isLandscapeMobile;
    }
  };

  onMounted(() => {
    updateIsMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateIsMobile);
      window.addEventListener('orientationchange', updateIsMobile);
    }
  });

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateIsMobile);
      window.removeEventListener('orientationchange', updateIsMobile);
    }
  });

  return {
    isMobile: readonly(isMobile),
    viewportWidth: readonly(viewportWidth),
  };
}
