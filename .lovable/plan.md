# Fix: "Navigate" button blocked by preview iframe

## Root cause

The Lovable preview embeds the app in a **sandboxed iframe**. A plain `<a href="https://www.google.com/maps/..." target="_blank">` inside that iframe is either:
- silently swallowed by the popup blocker, or
- opened as a sandboxed popup that immediately shows "www.google.com is blocked".

This has nothing to do with the Maps API key or website referrers. Google Maps cannot be *embedded* in the preview iframe (X-Frame-Options), and the *new tab* is being killed by the iframe's sandbox attribute, which we don't control.

The deployed/published app (outside the Lovable preview) is **not** sandboxed, so the same link works fine there. The fix must still make it work inside the preview.

## Fix

Replace the plain anchor with a click handler that tries multiple strategies in order, so it works in both the sandboxed preview and the published site:

1. **`window.open(url, "_blank", "noopener,noreferrer")`** — works in published site and most cases.
2. If `window.open` returns `null` (popup blocked / sandboxed), **`window.top.location.href = url`** — breaks out of the iframe and navigates the top window to Google Maps. Wrapped in try/catch because cross-origin top access can throw.
3. If even that throws (strict sandbox without `allow-top-navigation`), fall back to **copying the URL to the clipboard** and showing a toast: *"Couldn't open Google Maps from the preview. Link copied — paste it in a new tab. It will work normally on the deployed site."*

Apply the same handler to both the primary "Navigate" button and the secondary "Open in Google Maps" link in `StationSheet.tsx`.

## Files to change

- `src/components/StationSheet.tsx`
  - Add an `openNavigation()` handler implementing the 3-step fallback above.
  - Convert both `<a href={navUrl} target="_blank">` elements into `<button onClick={openNavigation}>` (keep identical styling so the UI doesn't shift).
  - Use the existing `useToast` hook for the clipboard-fallback message.
  - Update the helper text under the buttons to: *"Opens Google Maps in a new tab. If your browser blocks it inside the preview, the link is copied so you can paste it. It works normally on the deployed site."*

## Files NOT touched

- `src/lib/google-maps.ts` — no API key / referrer changes needed (this isn't an API key problem).
- `index.html`, Vite config — we cannot change the parent iframe's sandbox attribute; that's owned by Lovable's preview shell.
- `StationMap.tsx`, routing, Index.tsx — unaffected.

## About the unrelated console warnings

The console shows two pre-existing Radix `Sheet` warnings (`DialogContent requires a DialogTitle`, missing `Description`). They aren't causing the navigation issue but I'll fix them in the same pass by adding a visually-hidden `SheetTitle`/`SheetDescription` to the mobile bottom sheet in `Index.tsx`.

## Verification

After implementing, in the preview:
- Click **Navigate** → a new tab should open to `google.com/maps/dir/?...`. If the browser still blocks it, a toast appears and the link is on your clipboard.
- On the published/deployed site, clicking **Navigate** opens Google Maps directly with no fallback needed.

Approve and I will implement.