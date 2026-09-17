import { onMounted, onUnmounted, ref } from 'vue';

interface NetworkInformation extends EventTarget {
  readonly type?:
    | 'bluetooth'
    | 'cellular'
    | 'ethernet'
    | 'none'
    | 'wifi'
    | 'wimax'
    | 'other'
    | 'unknown';
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  readonly saveData?: boolean;
  onchange?: (this: NetworkInformation, ev: Event) => void;
}

export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine);
  const connectionType = ref<string | null>(null);
  const isWifi = ref(false);

  const updateStatus = () => {
    isOnline.value = navigator.onLine;

    const nav = navigator as Navigator & {
      connection?: NetworkInformation;
      mozConnection?: NetworkInformation;
      webkitConnection?: NetworkInformation;
    };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      connectionType.value = connection.type || null;
      // WiFi detection logic:
      // 1. Explicitly 'wifi' or 'ethernet'
      // 2. effectiveType is '4g' AND saveData is false (rough proxy if type is unknown)
      const isHighBandwidth = connection.type === 'wifi' || connection.type === 'ethernet';
      const isNotMetered = !connection.saveData && connection.effectiveType === '4g';

      isWifi.value = isHighBandwidth || (connection.type === undefined && isNotMetered);
    } else {
      isWifi.value = navigator.onLine;
    }
  };

  onMounted(() => {
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const nav = navigator as Navigator & {
      connection?: NetworkInformation;
      mozConnection?: NetworkInformation;
      webkitConnection?: NetworkInformation;
    };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    updateStatus();
  });

  onUnmounted(() => {
    window.removeEventListener('online', updateStatus);
    window.removeEventListener('offline', updateStatus);

    const nav = navigator as Navigator & {
      connection?: NetworkInformation;
      mozConnection?: NetworkInformation;
      webkitConnection?: NetworkInformation;
    };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      connection.removeEventListener('change', updateStatus);
    }
  });

  return {
    isOnline,
    connectionType,
    isWifi,
  };
}
