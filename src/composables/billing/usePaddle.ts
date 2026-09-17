import { computed, ref } from 'vue';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle?: any;
  }
}

const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

const isLoading = ref(false);
const isPaddleLoaded = ref(false);
const loadError = ref<string | null>(null);

const loadPaddleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Paddle) {
      resolve();
      return;
    }

    const existing = document.getElementById('paddle-script');
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'paddle-script';
    script.src = PADDLE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.body.appendChild(script);
  });
};

export interface PaddleCheckoutOptions {
  priceId: string;
  planId: string;
  email?: string;
}

export const usePaddle = () => {
  const initializePaddle = async () => {
    if (isPaddleLoaded.value) {
      return;
    }

    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;
    if (!token) {
      loadError.value = 'Paddle client token is not configured';
      return;
    }

    try {
      isLoading.value = true;
      await loadPaddleScript();

      const environment =
        import.meta.env.VITE_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';

      if (window.Paddle?.Environment?.set) {
        window.Paddle.Environment.set(environment);
      }

      if (window.Paddle?.Setup) {
        window.Paddle.Setup({ token });
      }

      isPaddleLoaded.value = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize Paddle';
      loadError.value = msg;
      console.error('[Paddle] init error', err);
    } finally {
      isLoading.value = false;
    }
  };

  const openPaddleCheckout = async (options: PaddleCheckoutOptions) => {
    await initializePaddle();

    if (!window.Paddle?.Checkout?.open) {
      throw new Error('Paddle checkout is not available');
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    window.Paddle.Checkout.open({
      items: [{ priceId: options.priceId, quantity: 1 }],
      customer: options.email ? { email: options.email } : undefined,
      customData: {
        planId: options.planId,
        source: 'web',
      },
      successUrl: `${origin}/setting/subscription?from=checkout_success`,
      closeUrl: `${origin}/setting/pricing-menu?from=checkout_cancel`,
    });
  };

  return {
    isPaddleReady: computed(() => isPaddleLoaded.value && !isLoading.value),
    isPaddleLoading: computed(() => isLoading.value),
    paddleError: loadError,
    openPaddleCheckout,
  };
};
