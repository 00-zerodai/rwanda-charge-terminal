/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, KIGALI_CENTER } from "@/lib/google-maps";
import { Station, googlePlaceToStation, classifyStation, StationKind } from "@/lib/stations";
import { useLocalState, SavedStation } from "@/lib/storage";
import type { MarkerClusterer as MarkerClustererType, Renderer } from "@googlemaps/markerclusterer";
import { fetchRoute } from "@/lib/directions";

/* ---------- Pin SVGs: car+bolt (EV charger) and moto+bolt (battery swap) ---------- */
const CAR_PIN_SVG = (fill: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='54' viewBox='0 0 44 54'>
      <defs>
        <filter id='sc' x='-20%' y='-20%' width='140%' height='140%'>
          <feDropShadow dx='0' dy='2' stdDeviation='2' flood-color='#000' flood-opacity='0.35'/>
        </filter>
      </defs>
      <path filter='url(#sc)' d='M22 2C11.5 2 3 10.4 3 20.7c0 13.7 17.3 29.5 18 30.2.6.5 1.4.5 2 0 .7-.7 18-16.5 18-30.2C41 10.4 32.5 2 22 2z'
            fill='${fill}' stroke='#ffffff' stroke-width='2'/>
      <circle cx='22' cy='20' r='11' fill='#ffffff'/>
      <!-- car silhouette -->
      <path d='M14.5 21.5 L15.5 18 Q15.8 17 16.8 17 H27.2 Q28.2 17 28.5 18 L29.5 21.5 H14.5 Z M14 22 H30 V24 Q30 24.6 29.4 24.6 H28.6 V25.3 Q28.6 25.8 28.1 25.8 H27.1 Q26.6 25.8 26.6 25.3 V24.6 H17.4 V25.3 Q17.4 25.8 16.9 25.8 H15.9 Q15.4 25.8 15.4 25.3 V24.6 H14.6 Q14 24.6 14 24 Z'
            fill='${fill}'/>
      <!-- lightning bolt overlay -->
      <path d='M24.6 13 L20.6 19.2 H22.8 L22 23 L26 16.6 H23.8 L24.6 13 Z'
            fill='#fbbf24' stroke='${fill}' stroke-width='0.4' stroke-linejoin='round'/>
    </svg>`,
  )}`;

const MOTO_PIN_SVG = (fill: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='54' viewBox='0 0 44 54'>
      <defs>
        <filter id='sm' x='-20%' y='-20%' width='140%' height='140%'>
          <feDropShadow dx='0' dy='2' stdDeviation='2' flood-color='#000' flood-opacity='0.35'/>
        </filter>
      </defs>
      <path filter='url(#sm)' d='M22 2C11.5 2 3 10.4 3 20.7c0 13.7 17.3 29.5 18 30.2.6.5 1.4.5 2 0 .7-.7 18-16.5 18-30.2C41 10.4 32.5 2 22 2z'
            fill='${fill}' stroke='#ffffff' stroke-width='2'/>
      <circle cx='22' cy='20' r='11' fill='#ffffff'/>
      <!-- motorcycle silhouette: two wheels + frame + handlebar -->
      <circle cx='16.2' cy='24' r='2.4' fill='none' stroke='${fill}' stroke-width='1.4'/>
      <circle cx='27.8' cy='24' r='2.4' fill='none' stroke='${fill}' stroke-width='1.4'/>
      <path d='M16.4 24 L20 19 H25 L27.6 24 M20 19 L18.5 17 H17 M25 19 L27 17 H28.5'
            fill='none' stroke='${fill}' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/>
      <!-- lightning bolt overlay -->
      <path d='M24.4 12.5 L20.4 18.7 H22.6 L21.8 22.5 L25.8 16.1 H23.6 L24.4 12.5 Z'
            fill='#fbbf24' stroke='${fill}' stroke-width='0.4' stroke-linejoin='round'/>
    </svg>`,
  )}`;

const PIN_FOR = (kind: StationKind, source: "google" | "custom") => {
  if (kind === "swap-moto") return MOTO_PIN_SVG("#ea580c"); // orange for swap
  if (source === "custom") return CAR_PIN_SVG("#16a34a"); // green custom
  return CAR_PIN_SVG("#2563eb"); // blue EV charger
};

/* Cluster bubble renderer (blue, like reference image) */
const clusterRenderer: Renderer = {
  render: ({ count, position }, stats) => {
    const max = stats.clusters.markers.max || 1;
    const ratio = count / max;
    const size = 44 + Math.round(ratio * 24); // 44..68
    const svg = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
        <circle cx='${size / 2}' cy='${size / 2}' r='${size / 2 - 2}' fill='#3b82f6' opacity='0.25'/>
        <circle cx='${size / 2}' cy='${size / 2}' r='${size / 2 - 8}' fill='#3b82f6' stroke='#ffffff' stroke-width='3'/>
      </svg>`,
    )}`;
    return new google.maps.Marker({
      position,
      icon: {
        url: svg,
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size / 2, size / 2),
      },
      label: {
        text: String(count),
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: "700",
      },
      zIndex: 1000 + count,
    });
  },
};

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

/* ---------- Landmark lookup (cached per station) ---------- */
const LANDMARK_CACHE_KEY = "cf_landmark_cache_v1";
const LANDMARK_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const LANDMARK_TYPES = [
  "lodging",
  "shopping_mall",
  "tourist_attraction",
  "restaurant",
  "stadium",
  "university",
  "hospital",
  "park",
  "airport",
];

function readLandmarkCache(): Record<string, { ts: number; name: string }> {
  try {
    return JSON.parse(localStorage.getItem(LANDMARK_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeLandmarkCache(map: Record<string, { ts: number; name: string }>) {
  try {
    localStorage.setItem(LANDMARK_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function fetchLandmarkFor(
  g: typeof google,
  svc: google.maps.places.PlacesService,
  station: Station,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const cache = readLandmarkCache();
    const cached = cache[station.id];
    if (cached && Date.now() - cached.ts < LANDMARK_TTL_MS) {
      resolve(cached.name || undefined);
      return;
    }
    svc.nearbySearch(
      {
        location: { lat: station.lat, lng: station.lng },
        radius: 400,
        type: undefined as any,
      },
      (results, st) => {
        if (st !== g.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
          resolve(undefined);
          return;
        }
        const candidates = results.filter(
          (r) =>
            r.name &&
            r.name.toLowerCase() !== station.name.toLowerCase() &&
            (r.types || []).some((t) => LANDMARK_TYPES.includes(t)),
        );
        const ranked = candidates.sort((a, b) => {
          const ar = (a.rating ?? 0) * Math.log((a.user_ratings_total ?? 0) + 2);
          const br = (b.rating ?? 0) * Math.log((b.user_ratings_total ?? 0) + 2);
          return br - ar;
        });
        const pick = ranked[0]?.name;
        if (pick) {
          cache[station.id] = { ts: Date.now(), name: pick };
          writeLandmarkCache(cache);
        }
        resolve(pick);
      },
    );
  });
}

/* ---------- Component ---------- */
const MAX_MARKERS = 500;

export const StationMap = ({
  apiKey,
  onSelect,
  selected,
  onRouteInfo,
  refreshKey = 0,
  flyTo,
  vehicleType,
}: {
  apiKey: string;
  onSelect: (s: Station) => void;
  selected?: Station | null;
  onRouteInfo?: (info: { distanceText: string; durationText: string } | null) => void;
  refreshKey?: number;
  flyTo?: { lat: number; lng: number; zoom?: number; key?: number } | null;
  vehicleType: "moto" | "car";
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const googleMarkersRef = useRef<google.maps.Marker[]>([]);
  const customMarkersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClustererType | null>(null);
  const pendingMarkersRef = useRef<google.maps.Marker[]>([]);
  const markerByIdRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const markerOrderRef = useRef<string[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const userLocationRef = useRef<google.maps.LatLngLiteral | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const idleTimerRef = useRef<number | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const [status, setStatus] = useState<string>("init");
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cf_legend_dismissed") !== "1";
    } catch {
      return true;
    }
  });
  const dismissLegend = () => {
    try {
      localStorage.setItem("cf_legend_dismissed", "1");
    } catch {
      /* ignore */
    }
    setLegendOpen(false);
  };

  const [customStations] = useLocalState<SavedStation[]>("cf_custom_stations", []);

  const wantedKind: StationKind = vehicleType === "moto" ? "swap-moto" : "ev-car";
  const wantedKindRef = useRef<StationKind>(wantedKind);
  useEffect(() => {
    wantedKindRef.current = wantedKind;
  }, [wantedKind]);

  // Pan/zoom to an external coordinate (search bar selection).
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    if (flyTo.zoom != null) mapRef.current.setZoom(flyTo.zoom);
  }, [flyTo?.key, flyTo?.lat, flyTo?.lng]);


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
          clickableIcons: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        placesRef.current = new g.maps.places.PlacesService(map);
        directionsRendererRef.current = new g.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: "#3b82f6",
            strokeOpacity: 0.85,
            strokeWeight: 5,
          },
        });
        setStatus("ready");

        // Best-effort geolocation (silent fallback)
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              userLocationRef.current = loc;
              const dot = `data:image/svg+xml;utf8,${encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='10' fill='#3b82f6' opacity='0.25'/><circle cx='11' cy='11' r='6' fill='#3b82f6' stroke='#fff' stroke-width='2'/></svg>`,
              )}`;
              userMarkerRef.current = new g.maps.Marker({
                position: loc,
                map,
                icon: { url: dot, scaledSize: new g.maps.Size(22, 22), anchor: new g.maps.Point(11, 11) },
                zIndex: 500,
              });
            },
            () => {
              /* denied — silent */
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
          );
        }

        // initial fetch
        fetchNearby();
        // Lazy-load MarkerClusterer after first idle (saves bytes on first paint)
        let clustererLoaded = false;
        const loadClusterer = () => {
          if (clustererLoaded) return;
          clustererLoaded = true;
          import("@googlemaps/markerclusterer").then((mod) => {
            const clusterer = new mod.MarkerClusterer({
              map,
              markers: [],
              renderer: clusterRenderer,
            });
            // Move any pending markers off the map and into the clusterer
            if (pendingMarkersRef.current.length) {
              pendingMarkersRef.current.forEach((m) => m.setMap(null));
              clusterer.addMarkers(pendingMarkersRef.current);
              pendingMarkersRef.current = [];
            }
            clustererRef.current = clusterer;
          });
        };
        // debounced fetch on pan/zoom idle
        map.addListener("idle", () => {
          loadClusterer();
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
    const zoom = map.getZoom() ?? 13;
    const radius = zoom >= 14 ? 3000 : zoom >= 12 ? 8000 : 15000;

    const handle = (results: google.maps.places.PlaceResult[] | null, st: google.maps.places.PlacesServiceStatus) => {
      const S = g.maps.places.PlacesServiceStatus;
      if (st === S.ZERO_RESULTS) {
        setStatus("empty");
        writeCache(key, []);
        return;
      }
      if (st === S.OVER_QUERY_LIMIT) {
        setError("Search rate-limited. Retrying shortly…");
        setStatus("error");
        window.setTimeout(() => {
          lastFetchKeyRef.current = null;
          setError(null);
          fetchNearby();
        }, 30000);
        return;
      }
      if (st === S.REQUEST_DENIED) {
        setError("Places API denied. Check API key restrictions and that Places API is enabled.");
        setStatus("error");
        return;
      }
      if (st !== S.OK || !results) {
        setStatus(`scan: ${String(st).toLowerCase()}`);
        return;
      }
      const stations = results
        .map(googlePlaceToStation)
        .filter((s): s is Station => !!s);
      writeCache(key, stations);
      mergeStations(g, map, stations);
      setStatus(stations.length ? "ready" : "empty");
    };

    svc.nearbySearch(
      {
        location: { lat, lng },
        radius,
        type: "electric_vehicle_charging_station" as any,
        keyword: "EV charging",
      },
      handle,
    );
  }

  function mergeStations(g: typeof google, map: google.maps.Map, stations: Station[]) {
    const fresh: google.maps.Marker[] = [];
    stations.forEach((s) => {
      if (seenIdsRef.current.has(s.id)) return;
      seenIdsRef.current.add(s.id);
      const marker = new g.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        title: s.name,
        optimized: true,
        icon: {
          url: PIN_FOR(s.kind, s.source),
          scaledSize: new g.maps.Size(44, 54),
          anchor: new g.maps.Point(22, 52),
        },
      });
      marker.addListener("click", () => {
        map.panTo({ lat: s.lat, lng: s.lng });
        const svc = placesRef.current;
        if (svc && !s.nearLandmark) {
          fetchLandmarkFor(g, svc, s).then((landmark) => {
            onSelect({ ...s, nearLandmark: landmark });
          });
        } else {
          onSelect(s);
        }
      });
      googleMarkersRef.current.push(marker);
      markerByIdRef.current.set(s.id, marker);
      markerOrderRef.current.push(s.id);
      fresh.push(marker);
    });
    if (fresh.length) {
      if (clustererRef.current) {
        clustererRef.current.addMarkers(fresh);
      } else {
        // Clusterer not loaded yet — show markers directly and queue them
        fresh.forEach((m) => m.setMap(map));
        pendingMarkersRef.current.push(...fresh);
      }
    }
    // Cap markers at MAX_MARKERS — evict oldest off-screen first
    if (markerOrderRef.current.length > MAX_MARKERS) {
      const overflow = markerOrderRef.current.length - MAX_MARKERS;
      const bounds = map.getBounds();
      const toEvict: { id: string; marker: google.maps.Marker }[] = [];
      const remaining: string[] = [];
      let evictedCount = 0;
      for (const id of markerOrderRef.current) {
        if (evictedCount >= overflow) {
          remaining.push(id);
          continue;
        }
        if (id === selectedIdRef.current) {
          remaining.push(id);
          continue;
        }
        const m = markerByIdRef.current.get(id);
        const pos = m?.getPosition();
        const offscreen = !!bounds && !!pos && !bounds.contains(pos);
        if (m && offscreen) {
          toEvict.push({ id, marker: m });
          evictedCount++;
        } else {
          remaining.push(id);
        }
      }
      if (toEvict.length) {
        const evictMarkers = toEvict.map((e) => e.marker);
        if (clustererRef.current) clustererRef.current.removeMarkers(evictMarkers);
        evictMarkers.forEach((m) => m.setMap(null));
        toEvict.forEach(({ id }) => {
          markerByIdRef.current.delete(id);
          seenIdsRef.current.delete(id);
        });
        markerOrderRef.current = remaining;
      }
    }
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
      const kind: StationKind = s.kind ?? classifyStation(s.name);
      const station: Station = { ...s, source: "custom", status: "online", kind };
      const marker = new g.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        title: s.name,
        icon: {
          url: PIN_FOR(kind, "custom"),
          scaledSize: new g.maps.Size(44, 54),
          anchor: new g.maps.Point(22, 52),
        },
        zIndex: 999,
      });
      marker.addListener("click", () => {
        map.panTo({ lat: s.lat, lng: s.lng });
        onSelect(station);
      });
      customMarkersRef.current.push(marker);
    });
  }, [customStations, status, onSelect]);

  /* Draw / clear route when selected station changes */
  useEffect(() => {
    const g = (window as any).google as typeof google | undefined;
    const renderer = directionsRendererRef.current;
    selectedIdRef.current = selected?.id ?? null;
    if (!g || !renderer) return;

    if (!selected) {
      renderer.setMap(null);
      onRouteInfo?.(null);
      return;
    }
    const origin = userLocationRef.current;
    if (!origin) {
      onRouteInfo?.(null);
      return;
    }
    renderer.setMap(mapRef.current!);
    fetchRoute(g, origin, { lat: selected.lat, lng: selected.lng })
      .then(({ result, distanceText, durationText }) => {
        renderer.setDirections(result);
        onRouteInfo?.({ distanceText, durationText });
      })
      .catch(() => {
        renderer.setMap(null);
        onRouteInfo?.(null);
      });
  }, [selected, onRouteInfo]);

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
          {status === "empty" && "No stations here — try zooming out"}
          {status === "error" && "Map failed to load"}
        </span>
      </div>

      {/* Legend chip — pin styles */}
      {legendOpen && (
        <div className="absolute left-3 top-12 z-10 rounded-xl border border-border bg-card/95 backdrop-blur-md px-3 py-2 text-[11px] shadow-soft flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-[#2563eb] ring-2 ring-white" />
            <span className="text-foreground/90 font-medium">EV charger</span>
          </div>
          <span className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-[#ea580c] ring-2 ring-white" />
            <span className="text-foreground/90 font-medium">Battery swap</span>
          </div>
          <button
            onClick={dismissLegend}
            aria-label="Dismiss legend"
            className="ml-1 text-muted-foreground hover:text-foreground transition text-base leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute left-3 bottom-3 z-10 flex gap-2">
        <button
          onClick={() => {
            const loc = userLocationRef.current;
            if (loc) {
              mapRef.current?.panTo(loc);
              mapRef.current?.setZoom(15);
            } else if ("geolocation" in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const l = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  userLocationRef.current = l;
                  mapRef.current?.panTo(l);
                  mapRef.current?.setZoom(15);
                },
                () => setError("Location permission denied"),
              );
            }
          }}
          className="rounded-full bg-primary text-primary-foreground border border-primary px-4 py-2 text-xs font-medium hover:bg-primary/90 transition shadow-soft"
        >
          ◉ My location
        </button>
        <button
          onClick={() => mapRef.current?.panTo(KIGALI_CENTER)}
          className="rounded-full bg-card/95 backdrop-blur border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-card transition shadow-soft"
        >
          ◎ Kigali
        </button>
      </div>

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