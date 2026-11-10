import { useEffect, useMemo, useState } from "react";
import { AppUser, SavedStation, useLocalState } from "@/lib/storage";
import { StationMap } from "@/components/StationMap";
import { StationSheet } from "@/components/StationSheet";
import { Station, classifyStation, distanceMeters } from "@/lib/stations";
import { AddStationDialog } from "@/components/AddStationDialog";
import { SidePanel } from "@/components/SidePanel";
import { Plus, User, Zap, RefreshCw, Info, X, Bike, Car, Filter, Building2 } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SearchBar } from "@/components/SearchBar";
import { VehiclePicker, VehicleType } from "@/components/VehiclePicker";
import { FilterDrawer, StationFilters, DEFAULT_FILTERS } from "@/components/FilterDrawer";
import voltaLogo from "@/assets/volta-logo.png";
import { GrowthFeedbackDialog } from "@/components/GrowthFeedbackDialog";
import { NearbyStationsList } from "@/components/NearbyStationsList";
import { useCommunityStations } from "@/lib/community-stations";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

const Index = ({ user, userId }: { user: AppUser; userId: string }) => {
  const { language, setLanguage, t } = useLanguage();
  const apiKey = GOOGLE_MAPS_API_KEY;
  const [selected, setSelected] = useState<Station | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(null);
  const [vehicleType, setVehicleType] = useLocalState<VehicleType | null>("cf_vehicle_type", null);
  const [legacyCustomStations] = useLocalState<SavedStation[]>("cf_custom_stations", []);
  const [filters, setFilters] = useState<StationFilters>(() =>
    DEFAULT_FILTERS((vehicleType ?? "car") as VehicleType),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleStations, setVisibleStations] = useState<Station[]>([]);
  const [nearestPanelDismissed, setNearestPanelDismissed] = useState(false);
  const isMobile = useIsMobile();
  const [growthOpen, setGrowthOpen] = useState(false);
  const [hasViewedStation, setHasViewedStation] = useState(false);
  const communityStations = useCommunityStations();
  const stationsForMap = useMemo(() => {
    const sharedIds = new Set(communityStations.map((station) => station.id));
    const legacyStations = legacyCustomStations
      .filter((station) => !sharedIds.has(station.id))
      .map((station): Station => ({
        ...station,
        kind: station.kind ?? classifyStation(station.name),
        source: "custom",
        status: "online",
      }));
    return [...communityStations, ...legacyStations];
  }, [communityStations, legacyCustomStations]);

  // Track when user opens a station; trigger growth popup after they close it (once per session).
  useEffect(() => {
    if (selected) {
      setHasViewedStation(true);
      return;
    }
    if (!hasViewedStation) return;
    if (sessionStorage.getItem("volta_growth_shown") === "1") return;
    sessionStorage.setItem("volta_growth_shown", "1");
    const t = setTimeout(() => setGrowthOpen(true), 400);
    return () => clearTimeout(t);
  }, [selected, hasViewedStation]);

  // Keep filters.vehicleType in sync with header toggle
  useEffect(() => {
    if (vehicleType && filters.vehicleType !== vehicleType) {
      setFilters((f) => ({ ...f, vehicleType: vehicleType as VehicleType }));
    }
  }, [vehicleType, filters.vehicleType]);

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
  const nearestStation = nearestId
    ? visibleStations.find((station) => station.id === nearestId) ?? null
    : null;
  const detailStation = selected ?? (nearestPanelDismissed ? null : nearestStation);

  const selectStation = (station: Station) => {
    setNearestPanelDismissed(true);
    setSelected(station);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md z-20">
        <div className="flex flex-wrap items-center justify-between px-4 py-3 gap-2">
          <div className="flex w-full items-center gap-2.5 min-w-0 sm:w-auto">
            <img
              src={voltaLogo}
              alt="Volta logo"
              className="h-9 w-9 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground leading-tight truncate">
                Volta
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">{t("Rwanda · EV stations")}</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-1 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-1.5">
            {/* Vehicle filter toggle */}
            <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5 mr-1">
              <button
                onClick={() => setVehicleType("moto")}
                aria-label={t("Show motorcycle stations")}
                className={
                  "h-9 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium transition " +
                  (vehicleType === "moto"
                    ? "bg-[hsl(24_95%_53%/0.15)] text-[hsl(24_95%_53%)]"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Bike size={14} />
                <span className="hidden sm:inline">{t("Moto")}</span>
              </button>
              <button
                onClick={() => setVehicleType("car")}
                aria-label={t("Show car stations")}
                className={
                  "h-9 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium transition " +
                  (vehicleType === "car"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Car size={14} />
                <span className="hidden sm:inline">{t("Car")}</span>
              </button>
            </div>
            <button
              onClick={() => setRefresh((r) => r + 1)}
              aria-label={t("Refresh")}
              className="h-10 w-10 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowFilters(true)}
              aria-label={t("Open filters")}
              className={
                "relative h-10 w-10 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg transition " +
                (filters.nearestFirst || filters.priceLowFirst || filters.connectors.length || filters.speeds.length
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted")
              }
            >
              <Filter size={16} />
              {(filters.nearestFirst || filters.priceLowFirst || filters.connectors.length > 0 || filters.speeds.length > 0) && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="h-10 sm:h-9 inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2.5 text-sm font-medium border border-border transition"
            >
              <Plus size={16} /> <span className="hidden xs:inline">{t("Add")}</span>
            </button>
            <Link
              to="/owner"
              aria-label={t("Owner portal")}
              className="h-10 sm:h-9 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-muted transition"
            >
              <Building2 size={15} />
              <span className="hidden sm:inline">{t("Owner portal")}</span>
            </Link>
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "rw" : "en")}
              aria-label={language === "en" ? "Hindura ururimi ujye mu Kinyarwanda" : "Switch language to English"}
              className="h-10 sm:h-9 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              {language === "en" ? "RW" : "EN"}
            </button>
            <button
              onClick={() => setShowPanel(true)}
              className="h-10 sm:h-9 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 sm:px-3 text-sm font-medium transition"
            >
              <User size={16} />
              <span className="hidden sm:inline truncate max-w-[100px]">{user.username}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <section className="relative flex-1 min-h-0 p-3 lg:p-3 lg:flex-1 h-[55dvh] lg:h-auto">
          <StationMap
            apiKey={apiKey}
            onSelect={selectStation}
            selected={selected}
            onRouteInfo={setRouteInfo}
            refreshKey={refresh}
            flyTo={flyTo}
            vehicleType={vehicleType}
            communityStations={stationsForMap}
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

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="absolute bottom-16 left-5 z-10 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:bg-primary/90"
          >
            <Plus size={17} />
            {t("Add a station")}
          </button>

          {/* Legend — inline pill on sm+, toggle button on mobile */}
          <div className="hidden sm:block pointer-events-none absolute right-6 bottom-3 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2 text-xs space-y-1 shadow-soft z-10">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">{t("Public stations")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-muted-foreground">{t("Community added")}</span>
            </div>
          </div>
          <div className="sm:hidden absolute right-5 bottom-3 z-10">
            {legendOpen ? (
              <div className="bg-card/95 backdrop-blur border border-border rounded-xl px-3 py-2 text-xs space-y-1 shadow-soft relative">
                <button
                  onClick={() => setLegendOpen(false)}
                  aria-label={t("Close legend")}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground"
                >
                  <X size={10} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{t("Public stations")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                  <span className="text-muted-foreground">{t("Community added")}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLegendOpen(true)}
                aria-label={t("Show legend")}
                className="h-8 w-8 rounded-full bg-card/95 backdrop-blur border border-border flex items-center justify-center text-muted-foreground shadow-soft"
              >
                <Info size={14} />
              </button>
            )}
          </div>
        </section>

        {/* Mobile: scrollable nearby list under the map */}
        {isMobile && (
          <section className="flex-1 min-h-0 overflow-y-auto">
            <NearbyStationsList
              stations={visibleStations}
              userLoc={userLoc}
              onSelect={(s) => {
                setFlyTo({ lat: s.lat, lng: s.lng, zoom: 15, key: Date.now() });
                selectStation(s);
              }}
              nearestId={nearestId}
              priceLowFirst={filters.priceLowFirst}
            />
          </section>
        )}

        {/* Desktop: persistent right side panel */}
        {!isMobile && (
          <StationSheet
            station={detailStation}
            routeInfo={routeInfo}
            onClose={() => {
              setSelected(null);
              setNearestPanelDismissed(true);
            }}
          />
        )}

        {/* Mobile: bottom sheet that only mounts when a station is selected */}
        {isMobile && (
          <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
            <SheetContent
              side="bottom"
              className="p-0 rounded-t-2xl border-t border-border max-h-[80vh] overflow-hidden"
            >
              <SheetTitle className="sr-only">
                {selected?.name ?? t("Station details")}
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t("Charging station details, navigation and save options.")}
              </SheetDescription>
              <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              <div className="overflow-auto max-h-[calc(80vh-1rem)]">
                <StationSheet
                  station={selected}
                  routeInfo={routeInfo}
                  onClose={() => setSelected(null)}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </main>

      {/* Overlays */}
      {showAdd && <AddStationDialog userId={userId} onClose={() => setShowAdd(false)} />}
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
      <GrowthFeedbackDialog open={growthOpen} onOpenChange={setGrowthOpen} />
    </div>
  );
};

export default Index;
