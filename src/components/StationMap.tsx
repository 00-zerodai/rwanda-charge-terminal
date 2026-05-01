/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, KIGALI_CENTER } from "@/lib/google-maps";
import { Station, googlePlaceToStation } from "@/lib/stations";
import { useLocalState, SavedStation } from "@/lib/storage";

/* ---------- Uber/Tesla-inspired dark map style ---------- */
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5a7d72" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }, { weight: 2 }] },

  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#9ad9c1" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#5a7d72" }] },

  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f1a14" }] },

  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#1a2128" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0d1117" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#2a3540" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0d1117" }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#222a33" }] },
  { featureType: "road.local", elementType: "geometry.fill", stylers: [{ color: "#171c22" }] },

  { featureType: "transit", stylers: [{ visibility: "off" }] },

  { featureType: "water", elementType: "geometry", stylers: [{ color: "#04090d" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d6e80" }] },

  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0e1410" }] },
];

/* ---------- Modern marker (SVG, no shadow ring on map) ---------- */
const PIN_SVG = (color: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>
      <circle cx='18' cy='18' r='14' fill='${color}' opacity='0.18'/>
      <circle cx='18' cy='18' r='10' fill='#0d1117' stroke='${color}' stroke-width='1.5'/>
      <path d='M18 11.5 L14.5 19 H17.5 L16.5 24.5 L21.5 16.5 H18.5 L19.5 11.5 Z'
            fill='${color}' stroke='${accent}' stroke-width='0.4' stroke-linejoin='round'/>
    </svg>`,
  )}`;

/* ---------- Cache (5 min TTL, persisted) ---------- */
const CACHE_KEY = "cf_places_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { ts: number; stations: Station[] };

function readCache(key: string): Station[] | null {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, CacheEntry>;
    const e = all[key];
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL_MS) return null;
    return e.stations;
  } catch {
    return null;
  }
}
function writeCache(key: string, stations: Station[]) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, CacheEntry>;
    all[key] = { ts: Date.now(), stations };
    // keep cache small
    const keys = Object.keys(all);
    if (keys.length > 20) keys.slice(0, keys.length - 20).forEach((k) => delete all[k]);
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota */
  }
}
const cellKey = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

/* ---------- Component ---------- */
export const StationMap = ({
  apiKey,
  onSelect,
  refreshKey = 0,
}: {
  apiKey: string;
  onSelect: (s: Station) => void;
  refreshKey?: number;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const googleMarkersRef = useRef<google.maps.Marker[]>([]);
  const customMarkersRef = useRef<google.maps.Marker[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const idleTimerRef = useRef<number | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);

  const [status, setStatus] = useState<string>("init");
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [customStations] = useLocalState<SavedStation[]>("cf_custom_stations", []);

  /* Init map */
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setStatus("loading");

    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        const map = new g.maps.Map(containerRef.current, {
          center: KIGALI_CENTER,
          zoom: 13,
          minZoom: 10,
          maxZoom: 18,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_CENTER },
          gestureHandling: "greedy",
          clickableIcons: false,
          backgroundColor: "#0d1117",
          styles: DARK_MAP_STYLE,
        });
        mapRef.current = map;
        placesRef.current = new g.maps.places.PlacesService(map);
        setStatus("ready");

        // initial fetch
        fetchNearby();
        // debounced fetch on pan/zoom idle
        map.addListener("idle", () => {
          if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
          idleTimerRef.current = window.setTimeout(fetchNearby, 600);
        });
      })
      .catch((e) => {
        setStatus("error");
        setError(e?.message ?? "Map failed to load");
      });

    return () => {
      cancelled = true;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, refreshKey]);

  function fetchNearby() {
    const map = mapRef.current;
    const svc = placesRef.current;
    const g = (window as any).google as typeof google | undefined;
    if (!map || !svc || !g) return;

    const center = map.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();
    const key = cellKey(lat, lng);
    if (key === lastFetchKeyRef.current) return; // already fetched at this cell
    lastFetchKeyRef.current = key;

    // Try cache
    const cached = readCache(key);
    if (cached) {
      setStatus("cached");
      mergeStations(g, map, cached);
      return;
    }

    setStatus("scanning");
    svc.nearbySearch(
      {
        location: { lat, lng },
        radius: 8000, // ~8km
        keyword: "EV charging station",
      },
      (results, st) => {
        if (st !== g.maps.places.PlacesServiceStatus.OK || !results) {
          setStatus(`scan: ${st.toLowerCase()}`);
          return;
        }
        const stations = results
          .map(googlePlaceToStation)
          .filter((s): s is Station => !!s);
        writeCache(key, stations);
        mergeStations(g, map, stations);
        setStatus("ready");
      },
    );
  }

  function mergeStations(g: typeof google, map: google.maps.Map, stations: Station[]) {
    const fresh: google.maps.Marker[] = [];
    stations.forEach((s) => {
      if (seenIdsRef.current.has(s.id)) return;
      seenIdsRef.current.add(s.id);
      const marker = new g.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        title: s.name,
        optimized: true,
        icon: {
          url: PIN_SVG("#3b82f6", "#0d1117"),
          scaledSize: new g.maps.Size(36, 36),
          anchor: new g.maps.Point(18, 18),
        },
        animation: g.maps.Animation.DROP,
      });
      marker.addListener("click", () => {
        map.panTo({ lat: s.lat, lng: s.lng });
        onSelect(s);
      });
      googleMarkersRef.current.push(marker);
      fresh.push(marker);
    });
    setCount(seenIdsRef.current.size);
    return fresh;
  }

  /* Render custom stations as cyan markers (separate layer, re-rendered on change) */
  useEffect(() => {
    const g = (window as any).google as typeof google | undefined;
    const map = mapRef.current;
    if (!g || !map) return;

    customMarkersRef.current.forEach((m) => m.setMap(null));
    customMarkersRef.current = [];

    customStations.forEach((s) => {
      const station: Station = { ...s, source: "custom", status: "online" };
      const marker = new g.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        title: s.name,
        icon: {
          url: PIN_SVG("#22c55e", "#0d1117"),
          scaledSize: new g.maps.Size(36, 36),
          anchor: new g.maps.Point(18, 18),
        },
      });
      marker.addListener("click", () => {
        map.panTo({ lat: s.lat, lng: s.lng });
        onSelect(station);
      });
      customMarkersRef.current.push(marker);
    });
  }, [customStations, status, onSelect]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-border">
      <div ref={containerRef} className="absolute inset-0 bg-background" />

      {/* HUD: top-left status pill */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border bg-card/90 backdrop-blur-md px-3 py-1.5 text-xs flex items-center gap-2 shadow-soft">
        <span
          className={
            "h-1.5 w-1.5 rounded-full " +
            (status === "error"
              ? "bg-destructive"
              : status === "scanning" || status === "loading" || status === "init"
              ? "bg-[hsl(var(--warning))] animate-pulse"
              : "bg-[hsl(var(--success))]")
          }
        />
        <span className="text-foreground/90 font-medium">
          {status === "scanning" && "Searching nearby…"}
          {status === "ready" && <>{count} stations</>}
          {status === "cached" && <>{count} stations</>}
          {status === "loading" && "Loading map…"}
          {status === "init" && "Starting…"}
          {status === "error" && "Map failed to load"}
        </span>
      </div>

      {/* Recenter button */}
      <button
        onClick={() => mapRef.current?.panTo(KIGALI_CENTER)}
        className="absolute left-3 bottom-3 z-10 rounded-full bg-card/95 backdrop-blur border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-card transition shadow-soft"
      >
        ◎ Center on Kigali
      </button>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-4 z-20">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm shadow-elevated">
            <h3 className="text-base font-semibold text-foreground">Map failed to load</h3>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Verify the API key in <code className="text-primary">src/lib/google-maps.ts</code> and that
              <span className="text-foreground"> Maps JavaScript API</span> and{" "}
              <span className="text-foreground">Places API</span> are enabled in Google Cloud Console.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};