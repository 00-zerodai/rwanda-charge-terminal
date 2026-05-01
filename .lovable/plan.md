# Native Maps handoff + "Add to Home Screen" install prompt

## Part A — Open native Google Maps app on mobile

Update `openNavigation()` in `src/components/StationSheet.tsx` to pick the best target per platform:

- **iOS (iPhone/iPad)**: try `comgooglemaps://?daddr=<lat>,<lng>&directionsmode=driving` first (Google Maps app). If the app isn't installed, the scheme silently fails — so after a 600ms timeout we fall back to `maps://?daddr=...` (Apple Maps, always present) **or** the existing `https://www.google.com/maps/...` web URL. We'll prefer the web URL fallback so the user always lands on Google Maps, not Apple Maps.
- **Android**: use `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`. Chrome on Android automatically intercepts this URL and opens the Google Maps app if installed; otherwise it stays in the browser. No custom intent URL needed and no "app not installed" error screen. This is Google's official recommendation.
- **Desktop**: keep the current `window.open` → top-nav → clipboard fallback chain (already works).

Detection via a tiny helper in `src/lib/platform.ts`:
```ts
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isAndroid = /Android/.test(navigator.userAgent);
export const isMobile = isIOS || isAndroid;
```

## Part B — Installable home-screen app (manifest-only, no service worker)

This is **not** a full PWA. No `vite-plugin-pwa`, no service worker, no offline cache — that approach breaks the Lovable preview. Instead, a plain web manifest gives us the install banner on Android and the "Add to Home Screen" flow on iOS, with the app launching fullscreen and showing a custom icon.

### Files to add

- **`public/manifest.webmanifest`** — name "ChargeFinder", short_name "ChargeFinder", `display: "standalone"`, `start_url: "/"`, `theme_color` + `background_color` from the existing primary token, icon entries pointing at the files below.
- **`public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/apple-touch-icon.png` (180×180)** — generated from the `Zap` lightning bolt on a primary-color rounded square. I'll generate these with ImageMagick during the implementation step (no design files needed).
- **`src/components/InstallPrompt.tsx`** — the banner component (see UX below).
- **`src/hooks/useInstallPrompt.ts`** — captures `beforeinstallprompt`, exposes `promptInstall()`, and detects iOS standalone mode (`navigator.standalone`) to know whether the app is already installed.

### Files to edit

- **`index.html`** — add:
  - `<link rel="manifest" href="/manifest.webmanifest">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="ChargeFinder">`
  - `<meta name="theme-color" content="#...">` matching the primary token
- **`src/App.tsx`** — mount `<InstallPrompt />` once at the root so it can show on any route.

### Banner UX (per your choice: auto-show after 30s on mobile)

`InstallPrompt` logic:

1. Mount → bail immediately if any of: not mobile, already in standalone mode (already installed), inside an iframe (Lovable preview / share preview), or `localStorage.cf_install_dismissed_at` is within the last 7 days.
2. Wait 30s after mount.
3. **Android (Chrome/Edge)**: if `beforeinstallprompt` fired during that wait, show a bottom sheet: *"Install ChargeFinder — Get faster access from your home screen."* with **Install** (calls `prompt()`) and **Not now** buttons.
4. **iOS Safari**: show the same sheet but with platform-specific copy: *"Tap the Share icon, then 'Add to Home Screen' to install ChargeFinder."* and a small inline diagram of the Share icon. Single **Got it** dismiss button.
5. Either dismissal writes `cf_install_dismissed_at = Date.now()` so it won't reappear for 7 days. Successful install fires `appinstalled` → we set a permanent flag and never show again.

The banner uses the existing `Sheet` component (`side="bottom"`) for visual consistency with the station sheet.

## Files NOT touched

- No service worker, no `vite-plugin-pwa`, no Vite config changes — keeps the Lovable preview working normally.
- `StationMap.tsx`, routing, auth — unchanged.
- The existing desktop "Open in Google Maps" fallback chain stays.

## Risks

| Risk | Mitigation |
|---|---|
| iOS deep link to `comgooglemaps://` triggers a "Cannot open page" alert if the app isn't installed | Skip the scheme attempt; always send iOS users to the `https://www.google.com/maps/...` URL. iOS Safari will offer to open in the Google Maps app if it's installed via a small banner. Cleaner UX. |
| Banner annoys returning users | 7-day dismissal cooldown + suppressed entirely once installed |
| Banner appears in Lovable preview iframe | `window.self !== window.top` check skips it |
| Manifest icons look bad on Android adaptive icon shapes | Include a separate `purpose: "maskable"` icon with safe-zone padding |

Approve and I'll implement: helper → maps handoff → icons + manifest → install hook + banner → wire into App.tsx.