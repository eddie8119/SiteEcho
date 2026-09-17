type GtagFunction = (
  command: 'js' | 'config' | 'event' | string,
  targetIdOrDate?: string | Date,
  params?: Record<string, unknown>
) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFunction;
    __ga_initialized__?: boolean;
  }
}

function injectGtag(measurementId: string) {
  const w = window as Window;
  if (w.__ga_initialized__) return;
  w.__ga_initialized__ = true;

  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag(...args: Parameters<GtagFunction>) {
    (w.dataLayer as unknown[]).push(args);
  } as GtagFunction;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head?.appendChild(script);
  }

  w.gtag('js', new Date());
  w.gtag('config', measurementId);
}

export function initializeGA() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (!measurementId) return;
  injectGtag(measurementId);
}

export function trackPageview(path?: string) {
  if (typeof window === 'undefined') return;
  const w = window as Window;
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (!measurementId || !w.gtag) return;
  w.gtag('config', measurementId, path ? { page_path: path } : undefined);
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const w = window as Window;
  if (!w.gtag) return;
  w.gtag('event', eventName, params || {});
}
