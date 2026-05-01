/// <reference types="google.maps" />
import { SavedStation } from "./storage";

export type Station = SavedStation & {
  source: "google" | "custom";
  status: "online" | "busy" | "offline" | "unknown";
  openNow?: boolean;
  types?: string[];
  nearLandmark?: string;
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
  },
];

export function getDemoStations(): Station[] {
  return KIGALI_DEMO;
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
  return {
    id: p.place_id,
    name: p.name ?? "Unknown station",
    address: p.vicinity ?? p.formatted_address ?? "",
    lat: p.geometry.location.lat(),
    lng: p.geometry.location.lng(),
    rating: p.rating,
    source: "google",
    status: open === false ? "offline" : open === true ? "online" : "unknown",
    openNow: open ?? undefined,
    types: p.types,
  };
}