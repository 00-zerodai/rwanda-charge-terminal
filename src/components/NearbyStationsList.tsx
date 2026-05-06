import { useMemo } from "react";
import { Station, distanceMeters, formatDistance, SPEED_LABEL } from "@/lib/stations";
import { Bike, Car, Zap, Sparkles } from "lucide-react";
import { KIGALI_CENTER } from "@/lib/google-maps";

export const NearbyStationsList = ({
  stations,
  userLoc,
  onSelect,
  nearestId,
}: {
  stations: Station[];
  userLoc: { lat: number; lng: number } | null;
  onSelect: (s: Station) => void;
  nearestId: string | null;
}) => {
  const origin = userLoc ?? KIGALI_CENTER;

  const sorted = useMemo(() => {
    return [...stations]
      .map((s) => ({ s, d: distanceMeters(origin, { lat: s.lat, lng: s.lng }) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 50);
  }, [stations, origin.lat, origin.lng]);

  return (
    <div className="bg-card border-t border-border">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Nearby stations</h2>
        <span className="text-[11px] text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "result" : "results"} · sorted by distance
        </span>
      </div>
      <ul className="divide-y divide-border max-h-full">
        {sorted.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No stations in view — pan or zoom the map.
          </li>
        )}
        {sorted.map(({ s, d }) => {
          const isSwap = s.kind === "swap-moto";
          const isNearest = s.id === nearestId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition flex items-start gap-3"
              >
                <div
                  className={
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 " +
                    (isSwap
                      ? "bg-[hsl(24_95%_53%/0.15)] text-[hsl(24_95%_53%)]"
                      : "bg-primary/15 text-primary")
                  }
                >
                  {isSwap ? <Bike size={18} /> : <Car size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {s.name}
                    </div>
                    {isNearest && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wide shrink-0">
                        <Sparkles size={9} /> Nearest
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-medium text-foreground/80">
                      {formatDistance(d)}
                    </span>
                    <span>·</span>
                    <span>{isSwap ? "Battery swap" : "EV charger"}</span>
                    {s.speed && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Zap size={10} />
                          {SPEED_LABEL[s.speed]}
                          {s.kw ? ` ${s.kw}kW` : ""}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                    {s.pricePerKwh
                      ? `${s.pricePerKwh} RWF/kWh`
                      : s.swapPrice
                      ? `${s.swapPrice} RWF/swap`
                      : "Pricing — coming soon"}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};