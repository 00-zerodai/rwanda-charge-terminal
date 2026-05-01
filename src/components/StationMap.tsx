/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, KIGALI_CENTER } from "@/lib/google-maps";
import { Station, getDemoStations, googlePlaceToStation } from "@/lib/stations";
import { useLocalState, SavedStation } from "@/lib/storage";
import { TerminalLine, Typewriter } from "./Terminal";

const TERMINAL_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#00cfff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1b3a2e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#0f1f1a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#00ff9f" }, { weight: 0.3 }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#00ff9f" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#031216" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#00cfff" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0a1410" }] },
];

const PIN_SVG = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='40' viewBox='0 0 32 40'>
      <defs><filter id='g' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='2'/></filter></defs>
      <circle cx='16' cy='16' r='10' fill='${color}' opacity='0.35' filter='url(%23g)'/>
      <path d='M16 2 L24 14 L16 38 L8 14 Z' fill='${color}' stroke='#0d1117' stroke-width='1.5'/>
      <text x='16' y='18' font-family='monospace' font-size='10' font-weight='bold' fill='#0d1117' text-anchor='middle'>⚡</text>
    </svg>`,
  )}`;

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
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [logs, setLogs] = useState<string[]>(["BOOTING_MAP_KERNEL..."]);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [customStations] = useLocalState<SavedStation[]>("cf_custom_stations", []);

  const log = (msg: string) => setLogs((l) => [...l.slice(-3), msg]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (apiKey === "DEMO") {
      setDemo(true);
      log("DEMO_MODE: rendering offline grid");
      return;
    }

    let cancelled = false;
    log("LOADING gmaps.js...");
    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        log("MAP_KERNEL OK");
        const map = new g.maps.Map(containerRef.current, {
          center: KIGALI_CENTER,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          styles: TERMINAL_MAP_STYLE,
          backgroundColor: "#0d1117",
        });
        mapRef.current = map;
        log("SCANNING NEARBY EV NODES...");
        const svc = new g.maps.places.PlacesService(map);
        svc.nearbySearch(
          {
            location: KIGALI_CENTER,
            radius: 15000,
            keyword: "EV charging station",
          },
          (results, status) => {
            if (status !== g.maps.places.PlacesServiceStatus.OK || !results) {
              log(`SCAN_RESULT: ${status}`);
              return;
            }
            const stations = results
              .map(googlePlaceToStation)
              .filter((s): s is Station => !!s);
            log(`FOUND ${stations.length} STATION(S)`);
            renderMarkers(g, map, stations);
          },
        );
      })
      .catch((e) => {
        setError(e.message ?? "map load failed");
        log("ERR: " + (e.message ?? "load failed"));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, refreshKey]);

  // Render custom + demo markers (also when demo mode active)
  useEffect(() => {
    if (!mapRef.current && !demo) return;
    if (demo) return; // demo handled in its own block below
    const g = (window as any).google as typeof google;
    if (!g) return;
    const map = mapRef.current!;
    const customs: Station[] = customStations.map((s) => ({
      ...s,
      source: "custom",
      status: "online",
    }));
    addMarkers(g, map, customs, "#00cfff");
  }, [customStations, demo]);

  function renderMarkers(g: typeof google, map: google.maps.Map, stations: Station[]) {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    addMarkers(g, map, stations, "#00ff9f");
    const customs: Station[] = customStations.map((s) => ({
      ...s,
      source: "custom",
      status: "online",
    }));
    addMarkers(g, map, customs, "#00cfff");
  }

  function addMarkers(g: typeof google, map: google.maps.Map, stations: Station[], color: string) {
    stations.forEach((s) => {
      const marker = new g.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        title: s.name,
        icon: {
          url: PIN_SVG(color),
          scaledSize: new g.maps.Size(32, 40),
          anchor: new g.maps.Point(16, 38),
        },
      });
      marker.addListener("click", () => onSelect(s));
      markersRef.current.push(marker);
    });
  }

  if (demo) {
    return <DemoMap onSelect={onSelect} customStations={customStations} />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-border">
      <div ref={containerRef} className="absolute inset-0 bg-background" />
      {/* Scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: "var(--gradient-scanline)" }}
      />
      {/* HUD overlay */}
      <div className="pointer-events-none absolute left-2 top-2 max-w-[80%] rounded-sm border border-border bg-background/80 backdrop-blur px-2 py-1 text-[10px] sm:text-xs">
        {logs.map((l, i) => (
          <TerminalLine key={i} tone={i === logs.length - 1 ? "green" : "dim"}>
            {l}
          </TerminalLine>
        ))}
      </div>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-4">
          <div className="terminal-box p-4 max-w-sm">
            <TerminalLine tone="amber">
              <Typewriter text={`MAP_LOAD_FAILED: ${error}`} />
            </TerminalLine>
            <p className="mt-2 text-xs text-dim">
              Check that your API key is valid and Maps JavaScript API + Places API are enabled.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* --------- DEMO MAP (no key) --------- */
const DemoMap = ({
  onSelect,
  customStations,
}: {
  onSelect: (s: Station) => void;
  customStations: SavedStation[];
}) => {
  const stations: Station[] = [
    ...getDemoStations(),
    ...customStations.map<Station>((s) => ({ ...s, source: "custom", status: "online" })),
  ];
  // project lat/lng to box coords (Kigali bbox)
  const minLat = -1.99,
    maxLat = -1.91,
    minLng = 30.03,
    maxLng = 30.14;
  const project = (lat: number, lng: number) => ({
    x: ((lng - minLng) / (maxLng - minLng)) * 100,
    y: (1 - (lat - minLat) / (maxLat - minLat)) * 100,
  });

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-border bg-background bg-grid">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: "var(--gradient-scanline)" }}
      />
      <div className="absolute left-2 top-2 rounded-sm border border-border bg-background/80 px-2 py-1 text-[10px] sm:text-xs">
        <TerminalLine tone="amber">DEMO_MODE :: Kigali_grid_v1</TerminalLine>
        <TerminalLine tone="dim">add API key for live data</TerminalLine>
      </div>
      {stations.map((s) => {
        const p = project(s.lat, s.lng);
        const color = s.source === "custom" ? "text-neon-cyan" : "text-neon-green";
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`absolute -translate-x-1/2 -translate-y-full ${color} group`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl leading-none animate-pulse-glow">⚡</span>
              <span className="text-[10px] font-bold whitespace-nowrap mt-0.5 px-1 bg-background/80 border border-current rounded-sm opacity-0 group-hover:opacity-100 transition">
                {s.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};