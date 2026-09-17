import { nextTick, watch, type WatchSource } from 'vue';
import { useRoute } from 'vue-router';

/**
 * Smoothly scrolls to a section when the current route hash matches the section ID.
 * Additional reactive dependencies can be provided to re-trigger the scroll after async data loads.
 */
export const useHashSectionScroll = (
  sectionId: string,
  extraDependencies: WatchSource<unknown>[] = []
) => {
  const route = useRoute();
  const targetHash = `#${sectionId}`;

  const scrollToSection = () => {
    if (route.hash !== targetHash) return;

    nextTick(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const watchSources: WatchSource<unknown>[] = [() => route.hash, ...extraDependencies];

  watch(
    watchSources,
    () => {
      scrollToSection();
    },
    { immediate: true }
  );

  return { scrollToSection };
};
