import type { Directive } from 'vue';

/**
 * Custom directive to suppress native keyboard on mobile devices
 * by setting inputmode='none' on input elements.
 *
 * Usage: v-inputmode-none="isMobile"
 * - When binding value is true, sets inputmode='none' on the first input element found
 * - Useful for date pickers, time pickers, and other components where you want
 *   to prevent native keyboard while keeping the UI panel functional
 */
const vInputmodeNone: Directive<HTMLElement, boolean> = {
  mounted(el: HTMLElement, binding: { value: boolean }) {
    if (!binding.value) return;

    const input = el.querySelector('input');
    if (input) {
      input.setAttribute('inputmode', 'none');
      // Re-apply on focus to ensure it persists across interactions
      input.addEventListener('focus', () => {
        input.setAttribute('inputmode', 'none');
      });
    }
  },
};

export default vInputmodeNone;
