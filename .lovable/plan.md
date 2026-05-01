
# Final MVP polish — Steps 5, 6, 7 + Navigation behavior

## Why "Open in Google Maps" works in a new tab but is blocked inside the Lovable preview

This is **not an API key / referrer issue** — adding `google.com` to your Maps API key referrer list will **not** fix it and is **not recommended** (referrers control which sites can call your *API key*, not which sites Google itself allows to be embedded).

The real cause:

1. The Lovable preview renders your app inside an `<iframe>`.
2. `https://www.google.com/maps/...` sends an HTTP response header `X-Frame-Options: SAMEORIGIN` (and a CSP `frame-ancestors` directive).
3. Browsers therefore refuse to display Google Maps inside any iframe whose origin is not `google.com`. The page appears blank / blocked.
4. When you click the link in a **new tab**, there is no iframe, no ancestor restriction, and the page loads normally.

This is enforced by Google's servers and **cannot be bypassed** from our side. There is no website-referral list, no API key setting, and no header we can add that will let `maps.google.com` render inside the Lovable preview iframe.

### What we will do instead

- Keep the existing **plain `<a target="_blank">`** for "Open in Google Maps" — this is the only reliable handoff and it already works.
- Add a clear hint next to the link on mobile: *"Opens in a new tab — Google Maps cannot run inside the preview."*
- For the in-app experience, we already render the **route polyline + ETA inside our own map** via the Directions API (Step 3, done). That is the "preview navigation" the user can see without leaving the app.
- A true turn-by-turn navigator inside the iframe would require building our own (Mapbox/Google Directions step-by-step UI) — out of scope for MVP.

---

## Step 5 — Mobile bottom sheet for `StationSheet`

Current behavior: on mobile (<lg) the sheet stacks under the map and eats ~42vh permanently, even with no station selected.

Changes:
- Use `useIsMobile()` in `Index.tsx`. On mobile, render `StationSheet` only when `selected` is set.
- Replace the bottom block with a Radix `Sheet` (`side="bottom"`) — already in `src/components/ui/sheet.tsx`. Rounded top corners, drag handle, close on overlay tap.
- Desktop (≥lg) keeps the existing right side panel — unchanged.
- Add the "opens in a new tab" hint under the Navigate button.
- Bump header icon buttons in `Index.tsx` from `h-9 w-9` → `h-11 w-11` on mobile for 44px tap targets.

## Step 6 — Legend toggle on small screens

Current legend pill (`Public stations` / `Community added`) is always visible bottom-right and overlaps the My-location button area on narrow viewports.

Changes in `Index.tsx`:
- On `<sm`, replace the legend with a single 32px circular "i" button bottom-right.
- Tap toggles a small popover with the two legend rows.
- On `≥sm`, keep the inline pill as today.

## Step 7 — Marker cap + lazy clusterer

Changes in `StationMap.tsx`:
- **Cap at 500 markers.** When `seenIdsRef.size > 500`, evict the oldest off-screen markers: keep an insertion-order array, slice the first N that are outside `map.getBounds()`, call `setMap(null)` and `clusterer.removeMarkers(...)` on them, and delete their IDs from `seenIdsRef`.
- **Lazy-load `MarkerClusterer`.** Remove the static `import { MarkerClusterer } from "@googlemaps/markerclusterer"` at top. Inside the first `idle` listener, do `const mod = await import("@googlemaps/markerclusterer")` and instantiate the clusterer then. Until it loads, markers are added directly via `marker.setMap(map)` and re-parented to the clusterer once ready. Saves ~15KB on first paint.

---

## Files to modify

- `src/pages/Index.tsx` — mobile sheet wrapper, legend toggle, larger tap targets
- `src/components/StationSheet.tsx` — add "opens in new tab" hint; component already pure-presentational so no breaking change
- `src/components/StationMap.tsx` — marker cap eviction, lazy `MarkerClusterer` import

## Files NOT touched

- `src/lib/google-maps.ts`, `src/lib/directions.ts`, `src/lib/stations.ts` — stable
- Auth, Add station, Charging flow, QR/NFC, payment UI — untouched
- The Navigate `<a>` tag stays a plain anchor with `target="_blank"` (do not add onClick handlers)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Lazy clusterer race: markers added before module loads | Buffer them in a local array; flush into clusterer in the `.then(...)` |
| Bottom sheet covers My-location button on small screens | Sheet only mounts when `selected` is set; map controls are obscured only while a station is open, which is expected |
| Marker eviction removes a currently-selected pin | Skip eviction for `selected?.id` |

## Order

5 → 6 → 7. After each step the app remains shippable; if any step breaks, I stop and report before continuing.

Approve and I will implement.
