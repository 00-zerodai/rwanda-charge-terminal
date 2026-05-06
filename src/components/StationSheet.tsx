import { useMemo, useState } from "react";
import { Station } from "@/lib/stations";
import { StatusBadge } from "./Terminal";
import { TerminalButton } from "./TerminalButton";
import { useLocalState, SavedStation, ChargeHistoryEntry } from "@/lib/storage";
import { ChargingFlow } from "./ChargingFlow";
import { toast } from "sonner";
import { buildMapsUrl, isIOS, isAndroid, openMapsOnIOS } from "@/lib/platform";
import { Star, MapPin, Navigation, Zap, Bookmark, BookmarkCheck, ExternalLink, Map, Route, Car, Bike, Plug, Gauge, BatteryCharging, Gift, Smartphone, CreditCard, Tag } from "lucide-react";
import { SPEED_LABEL, SPEED_KW } from "@/lib/stations";

export const StationSheet = ({
  station,
  routeInfo,
  onClose,
}: {
  station: Station | null;
  routeInfo?: { distanceText: string; durationText: string } | null;
  onClose: () => void;
}) => {
  const [saved, setSaved] = useLocalState<SavedStation[]>("cf_saved_stations", []);
  const [flow, setFlow] = useState(false);

  const navUrl = useMemo(
    () =>
      station
        ? buildMapsUrl(station.lat, station.lng)
        : "",
    [station],
  );

  const openNavigation = () => {
    if (!station || !navUrl) return;

    // iOS: try the Google Maps app first, fall back to Apple Maps if
    // Google Maps isn't installed (Apple Maps is always present).
    if (isIOS) {
      openMapsOnIOS(station.lat, station.lng);
      return;
    }

    // Android: navigate to google.com/maps — Chrome auto-opens the
    // Google Maps app if installed, otherwise stays on the web map.
    if (isAndroid) {
      try {
        window.location.href = navUrl;
        return;
      } catch {
        // fall through to desktop fallback chain
      }
    }
    // 1. Try a normal popup — works on the published site and most browsers.
    let popup: Window | null = null;
    try {
      popup = window.open(navUrl, "_blank", "noopener,noreferrer");
    } catch {
      popup = null;
    }
    if (popup) return;

    // 2. Popup blocked (typical inside the Lovable preview iframe sandbox).
    //    Try to break out of the iframe by navigating the top window.
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = navUrl;
        return;
      }
      window.location.href = navUrl;
      return;
    } catch {
      // 3. Strict sandbox forbids top-navigation — copy the link instead.
      try {
        navigator.clipboard.writeText(navUrl);
        toast.success("Link copied", {
          description:
            "The preview blocked Google Maps. Paste the link in a new tab — it works normally on the deployed site.",
        });
      } catch {
        toast.error("Couldn't open Google Maps", {
          description: navUrl,
        });
      }
    }
  };

  if (!station) {
    return (
      <aside className="border-t border-border bg-card/95 backdrop-blur-md lg:w-[360px] lg:max-w-[360px] lg:border-l lg:border-t-0">
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Map size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Select a station</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap a charging marker to view details and open directions outside the map.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const isSaved = saved.some((s) => s.id === station.id);
  const isSwap = station.kind === "swap-moto";

  const toggleSave = () => {
    if (isSaved) setSaved(saved.filter((s) => s.id !== station.id));
    else
      setSaved([
        ...saved,
        {
          id: station.id,
          name: station.name,
          address: station.address,
          lat: station.lat,
          lng: station.lng,
          rating: station.rating,
          custom: station.source === "custom",
          kind: station.kind,
        },
      ]);
  };

  return (
    <aside className="border-t border-border bg-card/95 backdrop-blur-md lg:w-[360px] lg:max-w-[360px] lg:border-l lg:border-t-0">
      <div className="h-full max-h-[42vh] overflow-auto lg:max-h-none">
        {flow ? (
          <div className="p-5 relative">
            <button
              className="absolute right-3 top-3 z-10 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
              onClick={() => setFlow(false)}
              aria-label="Back to station details"
            >
              <ExternalLink size={18} />
            </button>
            <ChargingFlow station={station} onDone={() => setFlow(false)} />
          </div>
        ) : (
          <>
            <div className="relative p-5 pb-4 border-b border-border">
              <div className="flex items-start gap-3 pr-2">
                <div
                  className={
                    "relative h-11 w-11 rounded-xl flex items-center justify-center shrink-0 " +
                    (isSwap
                      ? "bg-[hsl(24_95%_53%/0.15)] text-[hsl(24_95%_53%)]"
                      : "bg-primary/15 text-primary")
                  }
                >
                  {isSwap ? <Bike size={20} /> : <Car size={20} />}
                  <Zap
                    size={10}
                    fill="currentColor"
                    className="absolute -bottom-0.5 -right-0.5 bg-card rounded-full p-[1px]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground leading-tight truncate">
                    {station.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                        (isSwap
                          ? "bg-[hsl(24_95%_53%/0.15)] text-[hsl(24_95%_53%)]"
                          : "bg-primary/15 text-primary")
                      }
                    >
                      {isSwap ? "Battery swap" : "EV charger"}
                    </span>
                    <StatusBadge status={station.status} />
                    {station.rating ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Star size={12} className="text-[hsl(var(--warning))]" fill="currentColor" />
                        {station.rating.toFixed(1)}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {station.source === "google" ? "Google Places" : "Community"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {station.nearLandmark && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                  <div className="text-sm text-foreground">
                    Near <span className="font-medium">{station.nearLandmark}</span>
                  </div>
                </div>
              )}
              {station.address && (
                <div className="flex items-start gap-3">
                  <MapPin
                    size={16}
                    className={
                      (station.nearLandmark ? "text-muted-foreground/60" : "text-muted-foreground") +
                      " mt-0.5 shrink-0"
                    }
                  />
                  <div className="text-sm text-muted-foreground">{station.address}</div>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
              </div>

              {routeInfo && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <Route size={14} className="text-primary" />
                  <span className="font-medium text-foreground">{routeInfo.durationText}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{routeInfo.distanceText}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Driving</span>
                </div>
              )}

              {/* Technical specs */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSwap ? "Service" : "Charging specs"}
                </h3>

                {isSwap ? (
                  <div className="flex items-start gap-2.5">
                    <BatteryCharging size={16} className="text-[hsl(24_95%_53%)] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Battery Swap Station</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Swap a depleted battery for a fully charged one. No connector required.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <Plug size={14} className="text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-muted-foreground">Connectors</div>
                        {station.connectors && station.connectors.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {station.connectors.map((c) => (
                              <span
                                key={c}
                                className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground mt-0.5">Not available</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Gauge size={14} className="text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[11px] text-muted-foreground">Charging speed</div>
                        {station.speed ? (
                          <div className="text-sm font-medium text-foreground mt-0.5">
                            {SPEED_LABEL[station.speed]}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              {station.kw ? `${station.kw} kW` : SPEED_KW[station.speed]}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground mt-0.5">Not available</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Pricing placeholder */}
              <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/10 p-3">
                <Tag size={14} className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {isSwap ? "Swap price" : "Price per kWh"}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5">
                    {isSwap
                      ? station.swapPrice
                        ? `${station.swapPrice} RWF / swap`
                        : "— RWF · Coming soon"
                      : station.pricePerKwh
                      ? `${station.pricePerKwh} RWF / kWh`
                      : "— RWF · Coming soon"}
                  </div>
                </div>
              </div>

              {/* Rewards placeholder */}
              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-[hsl(var(--success))]/5 p-3">
                <Gift size={14} className="text-[hsl(var(--success))] mt-0.5 shrink-0" />
                <div className="text-xs text-foreground/90">
                  Earn <span className="font-semibold text-[hsl(var(--success))]">Volta points</span> when charging at partner stations.
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Rewards launching soon.</span>
                </div>
              </div>

              {/* Payments placeholder */}
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Pay
                  </h3>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Coming soon
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground opacity-70">
                    <Smartphone size={11} /> MTN MoMo
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground opacity-70">
                    <Smartphone size={11} /> Airtel Money
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground opacity-70">
                    <CreditCard size={11} /> Card
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <TerminalButton variant="green" size="lg" onClick={() => setFlow(true)} className="col-span-2">
                  <Zap size={16} /> Start charging
                </TerminalButton>

                <button
                  type="button"
                  onClick={openNavigation}
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition border border-border"
                >
                  <Navigation size={16} /> Navigate
                </button>

                <button
                  onClick={toggleSave}
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition border border-border"
                >
                  {isSaved ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} />}
                  {isSaved ? "Saved" : "Save"}
                </button>

                <button
                  type="button"
                  onClick={openNavigation}
                  className="col-span-2 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition pt-1"
                >
                  <ExternalLink size={12} /> Open in Google Maps
                </button>

                <p className="col-span-2 text-[11px] text-muted-foreground/80 text-center leading-snug">
                  Opens the Google Maps app on your phone — falls back to Apple Maps on iPhone, or the Maps website.
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className="col-span-2 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Clear selection
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export function logChargeSession(entry: ChargeHistoryEntry) {
  const raw = localStorage.getItem("cf_history");
  const list: ChargeHistoryEntry[] = raw ? JSON.parse(raw) : [];
  list.unshift(entry);
  localStorage.setItem("cf_history", JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new StorageEvent("storage", { key: "cf_history" }));
}
