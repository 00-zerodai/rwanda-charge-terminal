# Volta Smarter Discovery Upgrade

Transform the home screen from "map only" into a hybrid map + nearby list, add tap-to-preview callouts on markers, and lay UI groundwork for connectors compatibility, rewards, payments, and pricing.

## 1. Hybrid Map + List Layout (`src/pages/Index.tsx`)

Restructure mobile layout (desktop keeps existing right side panel):

```text
┌─────────── Header ───────────┐
│ Logo · Moto/Car · Filter ... │
├──────────────────────────────┤
│                              │
│   Map (60% height)           │
│                              │
├──────────────────────────────┤
│ Nearby stations  ↕ scroll    │
│ ┌──────────────────────────┐ │
│ │ 1.2km · Kigali Heights   │ │
│ │ EV Charger · Fast 50kW   │ │
│ ├──────────────────────────┤ │
│ │ 2.4km · CHIC Mall ...    │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- Build new `src/components/NearbyStationsList.tsx`. Receives `visibleStations`, `userLoc`, `onSelect`, `nearestId`. Sorts by distance from `userLoc` (fallback: Kigali center). Each row: distance pill, name, kind icon (car/moto), speed/connector chip, "Nearest" badge if applicable. Tapping a row calls `onSelect(station)` and `setFlyTo` to recenter map.
- Mobile: split screen — map ~55–60dvh, list scrolls below. Replace current full-height map section with a flex column.
- Desktop (lg+): keep current map + right StationSheet, but also render the list as a left rail under the search bar OR keep existing layout (skip list on desktop to avoid clutter — list is mobile/tablet primary).
- The bottom Sheet for station details on mobile is replaced by the marker callout flow (see #2). Full sheet still opens via "View details" from callout or list row.

## 2. Map Marker Callouts (`src/components/StationMap.tsx`)

- Replace immediate `onSelect(station)` on marker click with a Google `InfoWindow` styled to match the app (rounded card, dark theme).
- Callout content:
  - Station name (bold)
  - Distance from user
  - Kind label (Battery swap / EV charger)
  - Speed (Fast 50 kW) and 1–2 connector chips
  - Primary button: "View details" → calls existing `onSelect(station)` to open the full sheet
- Add new prop `onPreview(station)` (optional) — internally just opens the InfoWindow; existing `onSelect` is reserved for the full details sheet.
- Tapping anywhere else on the map closes the InfoWindow.
- The list rows in #1 also call `onSelect` directly (skip callout for list taps — user already chose).

## 3. Connector Types & Compatibility (`src/lib/stations.ts`, `FilterDrawer.tsx`)

- Extend `ConnectorType` union to include `"CCS1" | "CCS2" | "Type 2" | "CHAdeMO" | "GB/T" | "NACS"` (rename current `"CCS"` to `"CCS2"` as Rwanda default; keep "Tesla" mapped to NACS).
- Update `inferChargingSpec` heuristics to assign realistic combos (Type 2 + CCS2 default; superchargers → NACS+CCS2; etc.).
- Update `FilterDrawer` connector checkbox list to include new types.
- Station details (`StationSheet.tsx`) already renders connector chips — no change needed beyond data.

## 4. Swap vs Charging Differentiation

Already implemented (orange moto pin, blue car pin, header toggle, `wantedKind` filter). Keep as-is, just verify list rows in #1 also use the right icon/label.

## 5. Rewards UI Placeholder

- `src/components/SidePanel.tsx` (user/profile area): add a "Volta Points" card near the top showing `120 pts` (hardcoded) with a small gift icon and subtitle "Earn points by charging at partner stations (coming soon)".
- `src/components/StationSheet.tsx`: add a small info row under specs: "⭐ Earn Volta points when charging here" (muted style, no action).

## 6. Future Payments UI Placeholder (`StationSheet.tsx`)

Add a collapsed-style section above the action buttons:

```text
Pay (coming soon)
[ MTN MoMo ] [ Airtel Money ] [ Card ]   — disabled chips
```

Disabled buttons with `opacity-50`, no handler. Small caption: "In-app payments coming soon".

## 7. Price Comparison Placeholder

- Extend `Station` type with optional `pricePerKwh?: number` and `swapPrice?: number` (no data sources yet — all undefined).
- In `StationSheet.tsx` specs card and in NearbyStationsList rows: show "RWF — / kWh · Coming soon" muted line when undefined; show formatted price when present.

## 8. Nearest Station UX

Already done (green pulsing ring, "Nearest" label, no auto-open). Keep. Also surface "Nearest" badge on the matching list row in #1.

## 9 & 10. UI/Performance

- Reuse existing marker clusterer; no extra API calls — list reads from already-fetched `visibleStations` state in `Index.tsx`.
- List uses `react`'s built-in virtualization-free render capped to nearest ~50 (slice after sort) for smooth scroll.
- Maintain mobile-first spacing, reuse Tailwind tokens, no new deps.

## Files Touched

- `src/pages/Index.tsx` — layout restructure, pass `userLoc` to list
- `src/components/NearbyStationsList.tsx` — NEW
- `src/components/StationMap.tsx` — marker InfoWindow callout, route callout button to `onSelect`
- `src/lib/stations.ts` — expanded connector types + heuristics, optional price fields
- `src/components/FilterDrawer.tsx` — new connector options
- `src/components/StationSheet.tsx` — rewards line, payments placeholder, price line
- `src/components/SidePanel.tsx` — Volta Points card

No backend, schema, or dependency changes.
