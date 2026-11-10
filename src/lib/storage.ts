import { useEffect, useState } from "react";

export type SavedStation = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  custom?: boolean;
  kind?: "swap-moto" | "ev-car";
  pricePerKwh?: number;
  swapPrice?: number;
  photoUrls?: string[];
};

export type ChargeHistoryEntry = {
  id: string;
  stationId: string;
  stationName: string;
  date: string; // ISO
  kwh: number;
  amountRwf: number;
  method: "CARD" | "MTN_MOMO" | "AIRTEL_MONEY";
};

export type AppUser = { username: string };

const KEYS = {
  saved: "cf_saved_stations",
  history: "cf_history",
  apiKey: "cf_gmaps_key",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) setValue(read(key, fallback));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key]);
  const update = (v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      write(key, next);
      return next;
    });
  };
  return [value, update] as const;
}

export const storage = {
  KEYS,
  getApiKey: () => read<string>(KEYS.apiKey, ""),
  setApiKey: (k: string) => write(KEYS.apiKey, k),
};