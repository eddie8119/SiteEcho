type ClarityQueueFunction = ((...args: unknown[]) => void) & {
  q?: unknown[][];
};

declare global {
  interface Window {
    clarity?: ClarityQueueFunction;
    __clarity_initialized__?: boolean;
  }
}

function injectClaritySnippet(projectId: string) {
  const w = window as Window;

  if (w.__clarity_initialized__) return;
  w.__clarity_initialized__ = true;

  if (!w.clarity) {
    const clarityQueue: ClarityQueueFunction = (...args: unknown[]) => {
      const queue = clarityQueue.q || (clarityQueue.q = []);
      queue.push(args);
    };
    w.clarity = clarityQueue;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  const firstScript = document.getElementsByTagName('script')[0];

  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head?.appendChild(script);
  }
}

export function initializeClarity() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const projectId = import.meta.env.VITE_CLARITY_ID as string | undefined;
  if (!projectId) return;

  injectClaritySnippet(projectId);
}
