export function hasCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return true;
    }
  } catch (_) {
    // ignore
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  // Detect mobile devices including iPadOS 13+
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (/Macintosh/i.test(ua) && 'ontouchend' in document && navigator.maxTouchPoints > 1)
  );
}
