export const isIOS =
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as any).MSStream;

export const isAndroid =
  typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

export const isMobile = isIOS || isAndroid;

export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  // iOS
  if ((window.navigator as any).standalone === true) return true;
  // Android / desktop installed PWA
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
};

export const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/**
 * Build the best Google Maps directions URL for the current platform.
 *
 * - Android Chrome auto-intercepts google.com/maps URLs and opens the
 *   Google Maps app if installed.
 * - iOS Safari shows a small banner offering to open in the Google Maps
 *   app when navigating to google.com/maps URLs (if installed).
 * - Desktop opens the web Google Maps in a new tab.
 *
 * Always falls back to the web URL — never triggers an "app not installed"
 * error dialog.
 */
export const buildMapsUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;