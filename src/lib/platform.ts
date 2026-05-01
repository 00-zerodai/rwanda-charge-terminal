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
/**
 * iOS-specific: try the Google Maps app via its URL scheme. If the page
 * doesn't lose visibility within ~800ms (i.e. the app didn't launch),
 * fall back to Apple Maps which is always installed. Uses a hidden
 * iframe so iOS won't show a "Cannot Open Page" alert when the scheme
 * isn't handled.
 */
export const openMapsOnIOS = (lat: number, lng: number) => {
  const gmapsScheme = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  const appleMaps = `maps://?daddr=${lat},${lng}&dirflg=d`;

  let didHide = false;
  const onVisibility = () => {
    if (document.hidden) didHide = true;
  };
  document.addEventListener("visibilitychange", onVisibility);

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = gmapsScheme;
  document.body.appendChild(iframe);

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    iframe.remove();
    if (!didHide) {
      // Google Maps app not installed — open Apple Maps instead.
      window.location.href = appleMaps;
    }
  }, 800);
};
