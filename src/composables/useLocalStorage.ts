import { type Ref, ref, watch } from 'vue';

import { logError } from '@/utils/logger';

/**
 * A reactive localStorage-backed ref.
 * - Initializes from localStorage if present; otherwise uses the provided default value.
 * - Persists changes to localStorage (deep watch for objects/arrays).
 * - Provides helpers to manually load/save/clear.
 */
export function useLocalStorageRef<T>(key: string, defaultValue: T) {
  const state = ref<T>(defaultValue) as Ref<T>;

  const load = () => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        state.value = JSON.parse(raw) as T;
      }
    } catch (err) {
      logError(
        `[useLocalStorageRef] Failed to parse localStorage for key="${key}":`,
        err,
        'LocalStorage'
      );
    }
  };

  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state.value));
    } catch (err) {
      logError(
        `[useLocalStorageRef] Failed to save localStorage for key="${key}":`,
        err,
        'LocalStorage'
      );
    }
  };

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      logError(
        `[useLocalStorageRef] Failed to remove localStorage for key="${key}":`,
        err,
        'LocalStorage'
      );
    }
    // reset to defaultValue reference (shallow copy for objects/arrays is left to caller if needed)
    state.value = defaultValue;
  };

  // Eagerly load once on composable creation
  load();

  // Persist on any change (deep for objects/arrays)
  watch(
    state,
    () => {
      save();
    },
    { deep: true }
  );

  return { state, load, save, clear };
}
