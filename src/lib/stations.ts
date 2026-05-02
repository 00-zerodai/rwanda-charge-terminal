/// <reference types="google.maps" />
import { SavedStation } from "./storage";

export type StationKind = "swap-moto" | "ev-car";
export type ConnectorType = "Type 2" | "CCS" | "CHAdeMO" | "Tesla";
export type SpeedTier = "slow" | "fast" | "ultra";

export const SPEED_LABEL: Record<SpeedTier, string> = {
  slow: "Slow",
  fast: "Fast",
  ultra: "Ultra-fast",
};

export const SPEED_KW: Record<SpeedTier, string> = {
  slow: "≤ 22 kW",
  fast: "50–150 kW",
  ultra: "150+ kW",
};

/**
 * Classify a station by its name.
 * Spiro and Ampersand operate motorcycle battery-swap stations in Rwanda,
 * not regular EV chargers.
 */
export function classifyStation(name: string, types?: string[]): StationKind {
  const n = (name || "").toLowerCase();
  // Strong swap-station signals
  if (/\b(spiro|ampersand)\b/.test(n)) return "swap-moto";
  if (/battery\s*swap/.test(n)) return "swap-moto";
  if (/\bswap\b/.test(n)) return "swap-moto";
  // Strong EV-charging signals → car
  if (/(charging\s*station|ev\s*charging|kabisa|fast\s*charger|supercharger)/.test(n)) return "ev-car";
  // Default fallback
  return "ev-car";
}

/**
 * Mock realistic connector + speed defaults based on station name patterns.
 * Returns undefined for swap stations (no connectors).
 */
export function inferChargingSpec(
  name: string,
  kind: StationKind,
): { connectors: ConnectorType[]; speed: SpeedTier; kw: number } | undefined {
  if (kind !== "ev-car") return undefined;
  const n = (name || "").toLowerCase();
  if (/supercharger|tesla/.test(n)) {
    return { connectors: ["Tesla", "CCS"], speed: "ultra", kw: 250 };
  }
  if (/kabisa|ultra|hyper/.test(n)) {
    return { connectors: ["CCS", "CHAdeMO", "Type 2"], speed: "ultra", kw: 180 };
  }
  if (/fast|dc|rapid/.test(n)) {
    return { connectors: ["CCS", "Type 2"], speed: "fast", kw: 75 };
  }
  if (/mall|hub|heights|chic|hotel|lodge/.test(n)) {
    return { connectors: ["Type 2", "CCS"], speed: "fast", kw: 50 };
  }
  // Deterministic-ish fallback by name length so it doesn't churn
  const h = (name || "").length % 3;
  if (h === 0) return { connectors: ["Type 2"], speed: "slow", kw: 22 };
  if (h === 1) return { connectors: ["Type 2", "CCS"], speed: "fast", kw: 50 };
  return { connectors: ["CCS", "CHAdeMO"], speed: "fast", kw: 60 };
}

/** Haversine distance in meters */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export type Station = SavedStation & {
  source: "google" | "custom";
  status: "online" | "busy" | "offline" | "unknown";
  openNow?: boolean;
  types?: string[];
  nearLandmark?: string;
  kind: StationKind;
  connectors?: ConnectorType[];
  speed?: SpeedTier;
  kw?: number;
};

const KIGALI_DEMO: Station[] = [
  {
    id: "demo-1",
    name: "Kigali Heights EV Hub",
    address: "KG 7 Ave, Kigali",
    lat: -1.9536,
    lng: 30.0925,
    rating: 4.6,
    source: "custom",
    status: "online",
    kind: "ev-car",
  },
  {
    id: "demo-2",
    name: "Nyarutarama Charge Point",
    address: "KG 9 Ave, Nyarutarama",
    lat: -1.9367,
    lng: 30.0908,
    rating: 4.2,
    source: "custom",
    status: "busy",
    kind: "ev-car",
  },
  {
    id: "demo-3",
    name: "CHIC Mall Fast Charger",
    address: "Avenue du Commerce, Kigali",
    lat: -1.9498,
    lng: 30.0588,
    rating: 4.8,
    source: "custom",
    status: "online",
    kind: "ev-car",
  },
  {
    id: "demo-4",
    name: "Kimironko Station",
    address: "KG 11 Ave, Kimironko",
    lat: -1.9293,
    lng: 30.1199,
    rating: 3.9,
    source: "custom",
    status: "online",
    kind: "ev-car",
  },
  {
    id: "demo-5",
    name: "Remera Power Stop",
    address: "KK 15 Rd, Remera",
    lat: -1.9577,
    lng: 30.1127,
    rating: 4.1,
    source: "custom",
    status: "offline",
    kind: "ev-car",
  },
];

export function getDemoStations(): Station[] {
  return KIGALI_DEMO.map((s) => {
    const spec = inferChargingSpec(s.name, s.kind);
    return spec ? { ...s, ...spec } : s;
  });
}

export function googlePlaceToStation(p: google.maps.places.PlaceResult): Station | null {
  if (!p.geometry?.location || !p.place_id) return null;
  // Note: do NOT read `opening_hours.open_now` (deprecated, spams console).
  // Only use `isOpen()` if Google actually exposes it on this result.
  let open: boolean | undefined;
  try {
    const fn = (p as any).opening_hours?.isOpen;
    if (typeof fn === "function") open = fn.call((p as any).opening_hours);
  } catch {
    open = undefined;
  }
  const name = p.name ?? "Unknown station";
  const kind = classifyStation(name, p.types);
  const spec = inferChargingSpec(name, kind);
  return {
    id: p.place_id,
    name,
    address: p.vicinity ?? p.formatted_address ?? "",
    lat: p.geometry.location.lat(),
    lng: p.geometry.location.lng(),
    rating: p.rating,
    source: "google",
    status: open === false ? "offline" : open === true ? "online" : "unknown",
    openNow: open ?? undefined,
    types: p.types,
    kind,
    connectors: spec?.connectors,
    speed: spec?.speed,
    kw: spec?.kw,
  };
}