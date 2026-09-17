import { watch } from 'vue';

export function useDialogReset(getVisible: () => boolean, onReset: () => void) {
  watch(
    getVisible,
    (visible, previousVisible) => {
      if (!visible && previousVisible) {
        onReset();
      }
    },
    { flush: 'post' }
  );

  const createCancelHandler = (onClose: () => void) => {
    return () => {
      onReset();
      onClose();
    };
  };

  return { createCancelHandler };
}
