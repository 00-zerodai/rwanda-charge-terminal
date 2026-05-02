## Goal

Visually distinguish **battery-swap stations** (Spiro, Ampersand) from **EV charging stations** (cars) on the map and in the station sheet, using two different pin glyphs:

- 🏍️ **Motorcycle + lightning bolt** → battery swap stations (Spiro, Ampersand)
- 🚗 **Car + lightning bolt** → regular EV charging stations

## How we detect station type

Google Places doesn't return a "swap station" type, so we classify by **name match**. Add a helper in `src/lib/stations.ts`:

```ts
export type StationKind = "swap-moto" | "ev-car";

export function classifyStation(name: string): StationKind {
  const n = name.toLowerCase();
  if (/\b(spiro|ampersand)\b/.test(n)) return "swap-moto";
  if (/\bswap\b/.test(n) && /(moto|bike|bajaj|boda)/.test(n)) return "swap-moto";
  return "ev-car";
}
```

Attach `kind: StationKind` to every `Station` in `googlePlaceToStation` and when building custom stations.

## Pin icons (inline SVG, same style as current pin)

Replace the single `STATION_PIN_SVG` in `src/components/StationMap.tsx` with two variants that share the existing teardrop shape and white circle, but swap the inner glyph:

- **`CAR_PIN_SVG(fill)`** — car silhouette + small lightning bolt (current default look, refined)
- **`MOTO_PIN_SVG(fill)`** — motorcycle silhouette + small lightning bolt

Color coding:
- EV car charging: blue `#2563eb` (unchanged)
- Spiro / Ampersand swap: orange `#ea580c` (so they pop against the blue cluster of regular chargers)
- Custom user-added: green `#16a34a` (unchanged)

Marker creation in `mergeStations` and the custom-stations effect picks the SVG by `station.kind`.

## Station sheet

In `src/components/StationSheet.tsx`:
- Replace the generic `Zap` icon next to the station name with a `Bike` icon (lucide) for swap stations and `Car` icon for EV chargers, both with a small `Zap` overlay/adjacent.
- Add a small badge under the title: **"Battery swap"** (orange) or **"EV charger"** (blue).

## Legend

Add a tiny legend chip to the map HUD (top-left, under the status pill) showing both pin styles with labels "EV charging" and "Battery swap" so first-time users understand the difference. Collapsible/dismissible — stored in `localStorage` so it only shows once.

## Files to change

- `src/lib/stations.ts` — add `StationKind`, `classifyStation`, set `kind` on every Station
- `src/components/StationMap.tsx` — two pin SVGs, pick by `kind`, add legend chip
- `src/components/StationSheet.tsx` — kind-aware icon + badge
- `src/components/AddStationDialog.tsx` — let users pick "EV charger" vs "Battery swap" when adding a custom station (defaults to EV charger)
- `src/lib/storage.ts` — add optional `kind?: StationKind` to `SavedStation`

## Out of scope

- No backend / data source changes — classification is purely client-side from the station name.
- Existing cached stations in localStorage will be auto-classified on next load (no migration needed since `classifyStation` runs from `name`).