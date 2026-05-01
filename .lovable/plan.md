
# ChargeFinder MVP — Product & Technical Blueprint

This is a planning document only. No code will be written until you approve.

---

## 1. Architecture Plan

The app is a single-page React web app with four cleanly separated layers. Keeping them separate is the single most important decision — it is what prevents the navigation, popup, and "map not loading" bugs we hit in earlier iterations.

```text
 ┌───────────────────────────────────────────────────┐
 │  App Shell (header, auth, dialogs)                │
 │ ┌────────────────────┐  ┌──────────────────────┐  │
 │ │  MAP LAYER         │  │  DETAIL PANEL        │  │
 │ │  - Google Map      │  │  - Station info      │  │
 │ │  - Markers         │  │  - Navigate button   │  │
 │ │  - Clustering      │  │  - Start charging    │  │
 │ │  (display only)    │  │  (all user actions)  │  │
 │ └────────────────────┘  └──────────────────────┘  │
 │           │                       ▲                │
 │           └─── selectedStation ───┘                │
 └───────────────────────────────────────────────────┘
            │
            ▼
   DATA LAYER (Places API + local custom stations + cache)
```

**Components**

- **Google Map (base layer)** — only renders the map, markers, and clusters. It never owns user actions like "Navigate."
- **Station data service** — fetches from Google Places, merges in user-added stations from local storage, caches results.
- **Detail panel (UI layer)** — bottom sheet on mobile, side panel on desktop. Holds *all* action buttons.
- **Navigation handler** — pure HTML anchor tags pointing to Google Maps URLs. No JavaScript interception.

**Interaction flow**

1. Map loads → fetches nearby stations → renders markers.
2. User taps a marker → map only updates `selectedStation` state.
3. Detail panel (outside the map DOM) renders and shows a real `<a href>` "Navigate" link.
4. Click opens Google Maps in a new top-level tab — never inside the preview iframe.

---

## 2. Google Maps Strategy

**Maps JavaScript API**
- Loaded once via a single `<script>` tag with `libraries=places` and `v=weekly`.
- Use a single loader promise to prevent duplicate script injection (the #1 cause of "map not loading" warnings).
- Center on Kigali, zoom 13, dark style, default Google POIs visible (so users see real roads, malls, landmarks).

**Places API**
- Use `PlacesService.nearbySearch` with `keyword: "EV charging station"` and a radius (~8 km).
- Re-query only when the user pans/zooms to a new ~1 km grid cell (debounced on `idle`).
- Convert results to a normalized `Station` shape and render as custom SVG pin markers above the base map.

**Marker overlay strategy**
- Public stations: blue pin with ⚡ glyph.
- Community/custom stations: green pin.
- Cluster with `@googlemaps/markerclusterer` so dense areas don't visually break.

---

## 3. Google Cloud Setup (Validation Checklist)

**APIs to enable** (in this exact list, nothing more for MVP):
1. Maps JavaScript API
2. Places API
3. *(Optional later)* Geocoding API — only if you want to show human-readable addresses for custom-added stations.

**API key configuration**
- Create one **browser key** in Google Cloud Console → Credentials.
- **Application restrictions**: HTTP referrers. Add:
  - `http://localhost:*/*`
  - `https://*.lovable.app/*` (Lovable preview + published)
  - `https://your-final-domain.com/*` once you have one.
- **API restrictions**: limit the key to exactly the 2 APIs above. This both protects against abuse and surfaces config errors early.
- **Billing**: must be enabled on the project (you confirmed this). Without billing, Places returns `REQUEST_DENIED`.

**Common mistakes to avoid**
| Mistake | Symptom | Fix |
|---|---|---|
| Key restricted to wrong referrer | Gray map, "RefererNotAllowed" in console | Add Lovable preview domain |
| Places API not enabled | `status: REQUEST_DENIED` on search | Enable in Cloud Console |
| Loading script twice | "You have included Maps API multiple times" | Single loader promise |
| Using `v=beta` | Random breakage | Pin to `v=weekly` |
| No billing account | All requests denied | Link a billing account |
| Putting key in `<head>` without callback | Race condition, `google is undefined` | Use the `&callback=` pattern |

---

## 4. Navigation Design (Critical — This Is What Kept Breaking)

**Why it failed before**

Google Maps sets `X-Frame-Options: SAMEORIGIN`. The Lovable preview runs your app in an iframe. When a `window.open` or `window.location` call is intercepted by JavaScript inside that iframe, the browser tries to load Google Maps inside the iframe and gets `ERR_BLOCKED_BY_RESPONSE`. The link works when pasted manually because then it's a top-level navigation.

**The rule: navigation must be a native top-level browser action.**

**Design**

1. **No "Navigate" button inside marker popups or `InfoWindow`s.** Map markers only update selection state.
2. **Navigate lives in the detail panel** (rendered outside the map's DOM subtree, in a sibling React tree).
3. **It is a plain `<a>` tag** — not a button, not an `onClick`:
   - `href="https://www.google.com/maps/dir/?api=1&destination=LAT,LNG"`
   - `target="_blank"`
   - `rel="noopener noreferrer"`
4. **No `onClick`, no `preventDefault`, no `window.open`, no `window.location` for this action.** The browser does the right thing natively.
5. On mobile this naturally hands off to the Google Maps app via OS URL handling.

**UX pattern (Uber/Google Maps style)**

```text
[ Map fills screen ]
        │  user taps pin
        ▼
[ Bottom sheet slides up ]
   Station name · distance · rating
   ───────────────────────────────
   [  Navigate  →  ]   ← real <a href>
   [  Start charging ]
```

---

## 5. Data Strategy

**Primary source: Google Places**
- Query: `nearbySearch({ location, radius: 8000, keyword: "EV charging station" })`.
- Normalize each `PlaceResult` into a `Station` object: id, name, address, lat/lng, rating, openNow, types.
- Optionally enrich with a "near landmark" lookup (one extra `nearbySearch` for the top-rated nearby POI) — cached per station for 24h.

**Limit API usage (free-tier friendly)**
- **Grid-cell de-duplication**: round map center to 2 decimal places (~1 km cell). Skip re-fetch if same cell.
- **Debounce `idle` events** by ~600 ms.
- **Persistent localStorage cache** (5-minute TTL for results, 24h for landmarks).
- **Cap initial radius** at 8 km; only expand if the user explicitly zooms out.
- Never call Places on every render or every map move.

**Custom / user-added stations**
- Stored in localStorage (MVP) under a separate key.
- Rendered as a second marker layer (green) so they're visually distinct.
- Merged into the same selection flow so the detail panel works identically.

**Future upgrade path** (post-MVP, not now): move custom stations to Lovable Cloud so they sync across users.

---

## 6. UI / UX Structure

**Layout**

- **Mobile**: full-screen map; detail panel is a bottom sheet that appears on selection.
- **Desktop**: split view — map on the left (~65%), detail panel docked on the right (~35%).
- **Header**: app name, refresh, "Add station," profile.
- **Map HUD**: status pill (top-left), legend (bottom-right), "Center on Kigali" button (bottom-left).

**Hierarchy rules**

- Map = display surface. Touching a marker only *selects*.
- Panel = decision surface. All actions (Navigate, Start charging, Save) live here.
- Dialogs (Add station, Login) are full-overlay and pause map interaction.

**Visual style**

- Dark theme, rounded corners, soft shadows, blue accents.
- Clear marker differentiation (color + glyph).
- Cluster bubbles match the marker color family.

---

## 7. Build Plan (Step-by-Step)

Each step is independently verifiable — do not move to the next until the current one is proven working.

| Step | Goal | Done when… |
|---|---|---|
| 1 | Load Google Maps script with single-loader pattern | `console.log(google.maps)` works, no duplicate-load warning |
| 2 | Render base map centered on Kigali, default Google POIs visible | You can see roads, building names, malls |
| 3 | Wire Places API `nearbySearch`, log raw results | Console shows real EV station results |
| 4 | Render normalized stations as custom blue SVG markers + clustering | Pins appear over real map; clusters group correctly |
| 5 | Build detail panel (outside map DOM); marker click sets `selectedStation` | Tapping pin opens panel with name/address/rating |
| 6 | Add `<a href>` Navigate button in panel (no JS handler) | Click opens Google Maps in a new tab on desktop AND opens Maps app on mobile |
| 7 | Add caching, debouncing, grid-cell dedupe, idle re-fetch | Network tab shows ≤1 Places request per pan |
| 8 | Add "Add station" form → custom marker layer (green) | User-added pins appear and open the same panel |
| 9 | Polish: dark style, legend, status HUD, recenter button | App feels production-quality on mobile and desktop |

---

## 8. Failure Prevention

| Issue | Real cause | Prevention |
|---|---|---|
| Map doesn't load (gray box) | Script not loaded, or wrong API key referrer | Single loader promise; add Lovable domain to key referrers |
| `google is not defined` | Code runs before script callback | Use `&callback=` and resolve a promise inside it |
| Places returns `REQUEST_DENIED` | Places API not enabled, or key restricted to wrong API | Enable Places API; allow it in API restrictions |
| Places returns `OVER_QUERY_LIMIT` | Too many calls per second | Debounce `idle`; grid-cell dedupe; localStorage cache |
| "Navigate" link blocked (`ERR_BLOCKED_BY_RESPONSE`) | JS-driven navigation tries to load Maps inside iframe | Use plain `<a target="_blank">` outside the map DOM, no JS handlers |
| Map loaded twice warning | Multiple `<script>` injections from React re-renders | Loader is a module-level singleton promise |
| Markers pile up on re-render | Markers re-created without cleanup | Track marker refs, call `setMap(null)` before recreating |
| Mobile gestures feel laggy | `gestureHandling` default | Set `gestureHandling: "greedy"` |
| Custom stations disappear on reload | Stored only in component state | Persist to localStorage, hydrate on mount |
| Costs unexpectedly high | Re-fetching on every pan | Debounce + cache + cell dedupe (covered above) |

---

## What Approval of This Plan Means

If you approve, the next session will:

1. Reset the project to a minimal shell.
2. Implement steps 1–9 above in order, each verified before the next.
3. Keep the "Navigate" action as a plain `<a>` tag in the detail panel — never inside the map.
4. Stay within the 2 enabled APIs (Maps JavaScript + Places).

No code is being written yet. Reply "approve" (or with edits) to proceed.
