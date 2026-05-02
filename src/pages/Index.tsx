import { useEffect, useMemo, useState } from "react";
import { storage, MockUser, useLocalState } from "@/lib/storage";
import { MockLogin } from "@/components/MockLogin";
import { StationMap } from "@/components/StationMap";
import { StationSheet } from "@/components/StationSheet";
import { Station, distanceMeters } from "@/lib/stations";
import { AddStationDialog } from "@/components/AddStationDialog";
import { SidePanel } from "@/components/SidePanel";
import { Plus, User, Zap, RefreshCw, Info, X, Bike, Car, Filter } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SearchBar } from "@/components/SearchBar";
import { VehiclePicker, VehicleType } from "@/components/VehiclePicker";
import { FilterDrawer, StationFilters, DEFAULT_FILTERS } from "@/components/FilterDrawer";

const Index = () => {
  const [user, setUser] = useState<MockUser | null>(() => storage.getUser());
  const apiKey = GOOGLE_MAPS_API_KEY;
  const [selected, setSelected] = useState<Station | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(null);
  const [vehicleType, setVehicleType] = useLocalState<VehicleType | null>("cf_vehicle_type", null);
  const [filters, setFilters] = useState<StationFilters>(() =>
    DEFAULT_FILTERS((vehicleType ?? "car") as VehicleType),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleStations, setVisibleStations] = useState<Station[]>([]);
  const isMobile = useIsMobile();

  // Keep filters.vehicleType in sync with header toggle
  useEffect(() => {
    if (vehicleType && filters.vehicleType !== vehicleType) {
      setFilters((f) => ({ ...f, vehicleType: vehicleType as VehicleType }));
    }
  }, [vehicleType, filters.vehicleType]);

  if (!user) return <MockLogin onLogin={setUser} />;
  if (!vehicleType) return <VehiclePicker onPick={(v) => setVehicleType(v)} />;

  // Always compute nearest station so the map can highlight it automatically.
  const nearestId = (() => {
    if (!userLoc || visibleStations.length === 0) return null;
    let bestId: string | null = null;
    let bestD = Infinity;
    for (const s of visibleStations) {
      const d = distanceMeters(userLoc, { lat: s.lat, lng: s.lng });
      if (d < bestD) {
        bestD = d;
        bestId = s.id;
      }
    }
    return bestId;
  })();

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md z-20">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Zap size={18} fill="currentColor" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground leading-tight truncate">
                Volta
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Rwanda · EV stations</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Vehicle filter toggle */}
            <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5 mr-1">
              <button
                onClick={() => setVehicleType("moto")}
                aria-label="Show motorcycle stations"
                className={
                  "h-9 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium transition " +
                  (vehicleType === "moto"
                    ? "bg-[hsl(24_95%_53%/0.15)] text-[hsl(24_95%_53%)]"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Bike size={14} />
                <span className="hidden sm:inline">Moto</span>
              </button>
              <button
                onClick={() => setVehicleType("car")}
                aria-label="Show car stations"
                className={
                  "h-9 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium transition " +
                  (vehicleType === "car"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Car size={14} />
                <span className="hidden sm:inline">Car</span>
              </button>
            </div>
            <button
              onClick={() => setRefresh((r) => r + 1)}
              aria-label="Refresh"
              className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowFilters(true)}
              aria-label="Open filters"
              className={
                "relative h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg transition " +
                (filters.nearestFirst || filters.connectors.length || filters.speeds.length
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted")
              }
            >
              <Filter size={16} />
              {(filters.nearestFirst || filters.connectors.length > 0 || filters.speeds.length > 0) && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="h-11 sm:h-9 inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 text-sm font-medium border border-border transition"
            >
              <Plus size={16} /> <span className="hidden xs:inline">Add</span>
            </button>
            <button
              onClick={() => setShowPanel(true)}
              className="h-11 sm:h-9 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3 text-sm font-medium transition"
            >
              <User size={16} />
              <span className="hidden sm:inline truncate max-w-[100px]">{user.username}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <section className="relative flex-1 min-h-0 p-3 lg:p-3">
          <StationMap
            apiKey={apiKey}
            onSelect={setSelected}
            selected={selected}
            onRouteInfo={setRouteInfo}
            refreshKey={refresh}
            flyTo={flyTo}
            vehicleType={vehicleType}
            connectorFilter={filters.connectors}
            speedFilter={filters.speeds}
            nearestStationId={nearestId}
            onUserLocation={setUserLoc}
            onStationsChange={setVisibleStations}
          />

          <SearchBar
            onPick={({ lat, lng }) =>
              setFlyTo({ lat, lng, zoom: 15, key: Date.now() })
            }
          />

          {/* Legend — inline pill on sm+, toggle button on mobile */}
          <div className="hidden sm:block pointer-events-none absolute right-6 bottom-3 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2 text-xs space-y-1 shadow-soft z-10">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Public stations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-muted-foreground">Community added</span>
            </div>
          </div>
          <div className="sm:hidden absolute right-5 bottom-3 z-10">
            {legendOpen ? (
              <div className="bg-card/95 backdrop-blur border border-border rounded-xl px-3 py-2 text-xs space-y-1 shadow-soft relative">
                <button
                  onClick={() => setLegendOpen(false)}
                  aria-label="Close legend"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground"
                >
                  <X size={10} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Public stations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">Community added</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLegendOpen(true)}
                aria-label="Show legend"
                className="h-8 w-8 rounded-full bg-card/95 backdrop-blur border border-border flex items-center justify-center text-muted-foreground shadow-soft"
              >
                <Info size={14} />
              </button>
            )}
          </div>
        </section>

        {/* Desktop: persistent right side panel */}
        {!isMobile && (
          <StationSheet station={selected} routeInfo={routeInfo} onClose={() => setSelected(null)} />
        )}

        {/* Mobile: bottom sheet that only mounts when a station is selected */}
        {isMobile && (
          <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
            <SheetContent
              side="bottom"
              className="p-0 rounded-t-2xl border-t border-border max-h-[80vh] overflow-hidden"
            >
              <SheetTitle className="sr-only">
                {selected?.name ?? "Station details"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Charging station details, navigation and save options.
              </SheetDescription>
              <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              <div className="overflow-auto max-h-[calc(80vh-1rem)]">
                <StationSheet station={selected} routeInfo={routeInfo} onClose={() => setSelected(null)} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </main>

      {/* Overlays */}
      {showAdd && <AddStationDialog onClose={() => setShowAdd(false)} />}
      <SidePanel open={showPanel} onClose={() => setShowPanel(false)} onSelect={setSelected} />
      <FilterDrawer
        open={showFilters}
        onOpenChange={setShowFilters}
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          if (f.vehicleType !== vehicleType) setVehicleType(f.vehicleType);
        }}
        hasUserLocation={!!userLoc}
      />
    </div>
  );
};

export default Index;
