const colorCache = new Map<string, string>();
let observersInitialized = false;

const isDomAvailable = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const clearColorCache = () => {
  colorCache.clear();
};

export const invalidateClassColorCache = () => {
  clearColorCache();
};

const attachThemeMutationObserver = () => {
  if (typeof MutationObserver === 'undefined' || !document.documentElement) return;

  const observer = new MutationObserver((mutations) => {
    const themeChanged = mutations.some((mutation) =>
      ['class', 'data-theme'].includes(mutation.attributeName ?? '')
    );
    if (themeChanged) {
      clearColorCache();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
};

const attachMediaQueryListener = () => {
  if (typeof window.matchMedia !== 'function') return;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => clearColorCache();

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handler);
  } else if (typeof media.addListener === 'function') {
    media.addListener(handler);
  }
};

const initThemeObservers = () => {
  if (observersInitialized || !isDomAvailable()) {
    return;
  }

  observersInitialized = true;
  attachThemeMutationObserver();
  attachMediaQueryListener();
};

const createProbeElement = (className: string) => {
  const el = document.createElement('span');
  el.className = className;
  el.style.cssText = [
    'position:absolute',
    'visibility:hidden',
    'pointer-events:none',
    'top:-9999px',
    'left:-9999px',
  ].join(';');
  return el;
};

export const getClassColor = (className: string, fallback: string) => {
  if (!isDomAvailable()) {
    return fallback;
  }

  initThemeObservers();

  if (colorCache.has(className)) {
    return colorCache.get(className) as string;
  }

  const el = createProbeElement(className);
  document.body.appendChild(el);
  const computedColor = getComputedStyle(el).color || fallback;
  document.body.removeChild(el);

  colorCache.set(className, computedColor);
  return computedColor;
};
