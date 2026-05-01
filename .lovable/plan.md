
# ChargeFinder MVP — Build Plan

The map now loads, Places search runs, and station markers cluster correctly. The remaining work focuses on **route preview**, **reliability**, and **mobile polish** — without breaking what already works.

---

## What's already in place (no changes needed)

- Google Maps JS + Places loader (`src/lib/google-maps.ts`)
- Map with clustering, custom blue/green pins, recenter, status HUD (`StationMap.tsx`)
- Nearby search with 5-min cache + 24h landmark cache
- Station detail sheet with external "Open in Google Maps" link (anchor, no JS interception)
- Add-station, mock login, side panel, demo payment / QR-NFC flow

---

## Step 1 — Suppress noisy deprecation warnings (quick win)

The console is spammed by `open_now is deprecated` warnings coming from `googlePlaceToStation` reading `place.opening_hours.open_now`.

**Fix:** in `src/lib/stations.ts`, stop reading `open_now` directly. Either omit the field or use `place.opening_hours?.isOpen?.()` guarded with a try/catch. No UX change; cleaner logs and no risk when Google removes the property.

---

## Step 2 — Harden Places search

Current `nearbySearch` uses `keyword: "EV charging station"`, which returns mixed results.

**Changes in `StationMap.tsx → fetchNearby`:**
- Use `type: "electric_vehicle_charging_station"` (official Places type) and keep keyword as a fallback.
- Adapt radius to current zoom (`zoom >= 14 → 3km`, `12–13 → 8km`, `<12 → 15km`) so users see relevant stations as they pan.
- Handle `ZERO_RESULTS` explicitly: show "No stations in this area" pill instead of generic `scan: zero_results`.
- Handle `OVER_QUERY_LIMIT` / `REQUEST_DENIED`: show a one-time toast with the cause.

---

## Step 3 — In-app route preview (Directions API)

New: when a station is selected, show the route from the user's current location to the station **inside the map**, before they tap the external nav link.

**New module `src/lib/directions.ts`:**
- Wrap `google.maps.DirectionsService.route(...)` with `travelMode: DRIVING`.
- Return `{ polyline, distanceText, durationText }`.

**Wire-up in `StationMap.tsx`:**
- On mount, request `navigator.geolocation.getCurrentPosition` (graceful fallback to Kigali center if denied).
- Render a single `DirectionsRenderer` (suppress default markers; we keep our pins).
- When `selected` changes (lift `selected` into `Index` already done), draw the route. When sheet closes, clear the renderer.

**Wire-up in `StationSheet.tsx`:**
- Show the returned `distanceText` / `durationText` above the existing "Open in Google Maps" anchor.
- Anchor stays as-is (plain `<a target="_blank" rel="noopener noreferrer">`) — no JS interception.

Requires Directions API enabled (you confirmed this).

---

## Step 4 — "My location" control

- Add a small button next to "Center on Kigali" that pans/zooms to the user's geolocation and drops a subtle blue dot marker.
- Re-uses the geolocation result from Step 3; no extra prompt.

---

## Step 5 — Mobile polish

Viewport is 762×709 but real target is phones (~390×800). Tighten:
- Make `StationSheet` a bottom sheet on `<lg` breakpoints (drag handle, snap points: peek / half / full). Currently it's a side panel that overlaps the map awkwardly on mobile.
- Increase tap targets on header icons to 44px.
- Hide the legend pill behind a small "i" toggle on `<sm` to free map space.
- Ensure `100dvh` works on iOS Safari (already set).

---

## Step 6 — Failure handling & empty states

Centralized handling so the app never silently breaks:

| Failure | Detection | UX |
|---|---|---|
| Map JS fails to load | existing `loaderPromise` reject | Existing error card (keep) |
| Places `OVER_QUERY_LIMIT` | status check | Toast: "Search rate-limited, retrying in 30s" + auto-retry |
| Geolocation denied | `getCurrentPosition` error | Silent fallback to Kigali; route preview disabled with hint |
| Directions `ZERO_RESULTS` | status check | Hide preview, keep external link |
| No stations in viewport | `ZERO_RESULTS` | HUD says "No stations here — try zooming out" |

---

## Step 7 — Performance

- Already: clustering, cache, debounced idle refetch. Keep.
- Add: cap `seenIdsRef` at 500 stations; when exceeded, drop oldest off-screen markers from the clusterer to keep memory flat during long sessions.
- Lazy-load `MarkerClusterer` only after first `idle` event (saves ~15KB on first paint).

---

## Technical details (for reference)

**Files to add**
- `src/lib/directions.ts` — Directions API wrapper

**Files to modify**
- `src/lib/stations.ts` — remove `open_now` read
- `src/components/StationMap.tsx` — Places type, adaptive radius, geolocation, DirectionsRenderer, my-location control, marker cap
- `src/components/StationSheet.tsx` — show distance/duration; convert to bottom sheet on mobile (use existing `@/components/ui/drawer`)
- `src/pages/Index.tsx` — pass user location down; legend toggle on small screens

**No changes to**
- `src/lib/google-maps.ts` (key + loader fine)
- Auth, payment, QR/NFC, add-station flows

**APIs used**
- Maps JavaScript API ✅
- Places API ✅
- Directions API ✅ (new usage in Step 3)

---

## Failure prevention — common pitfalls

1. **`RefererNotAllowedMapError`** — caused by missing referrers. Fixed.
2. **Blank map / grey tiles** — usually billing disabled or wrong key. Confirmed OK.
3. **Markers don't appear** — `nearbySearch` returns `ZERO_RESULTS` silently; Step 6 surfaces this.
4. **Nav link blocked** — caused by `onClick` + `preventDefault` on buttons. We use a plain anchor — keep it that way.
5. **Geolocation prompt loops** — only call `getCurrentPosition` once per session; cache result.
6. **Quota burn** — debounced idle + cell-key cache prevent re-fetching the same area; keep it.
7. **Mobile sheet covers map** — Step 5 bottom sheet with snap points fixes this.

---

## Order of execution

Step 1 → 2 → 3 → 4 → 5 → 6 → 7. Each step is independently shippable; if anything breaks, we stop and report before moving on (per your instructions).

Approve and I'll implement starting at Step 1.
