import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Bike, Car, Filter, Plug, Zap, Locate } from "lucide-react";
import { ConnectorType, SpeedTier, SPEED_LABEL, SPEED_KW } from "@/lib/stations";
import { VehicleType } from "./VehiclePicker";

export type StationFilters = {
  vehicleType: VehicleType;
  nearestFirst: boolean;
  connectors: ConnectorType[]; // empty = all
  speeds: SpeedTier[]; // empty = all
};

export const DEFAULT_FILTERS = (vehicleType: VehicleType): StationFilters => ({
  vehicleType,
  nearestFirst: false,
  connectors: [],
  speeds: [],
});

const ALL_CONNECTORS: ConnectorType[] = [
  "Type 2",
  "CCS2",
  "CCS1",
  "CHAdeMO",
  "GB/T",
  "NACS",
];
const ALL_SPEEDS: SpeedTier[] = ["slow", "fast", "ultra"];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export const FilterDrawer = ({
  open,
  onOpenChange,
  filters,
  onChange,
  hasUserLocation,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: StationFilters;
  onChange: (f: StationFilters) => void;
  hasUserLocation: boolean;
}) => {
  const isCar = filters.vehicleType === "car";

  const Chip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-9 px-3 rounded-full border text-xs font-medium transition " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary text-secondary-foreground border-border hover:bg-muted")
      }
    >
      {children}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 w-full sm:max-w-sm flex flex-col"
      >
        <SheetTitle className="sr-only">Filter stations</SheetTitle>
        <SheetDescription className="sr-only">
          Adjust filters for vehicle type, distance, connectors and charging speed.
        </SheetDescription>

        <header className="px-5 py-4 border-b border-border flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Filter size={16} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">Filters</h2>
            <p className="text-[11px] text-muted-foreground">Refine stations on the map</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* Nearest */}
          <section>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Locate size={16} className="text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Show nearest first</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasUserLocation
                      ? "Sort list by distance and highlight the closest station."
                      : "Enable location to sort by distance."}
                  </p>
                </div>
              </div>
              <Switch
                checked={filters.nearestFirst}
                disabled={!hasUserLocation}
                onCheckedChange={(v) => onChange({ ...filters, nearestFirst: v })}
              />
            </div>
          </section>

          {/* Station type */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2.5">Station type</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...filters, vehicleType: "moto" })}
                className={
                  "flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition " +
                  (filters.vehicleType === "moto"
                    ? "border-[hsl(24_95%_53%)] bg-[hsl(24_95%_53%/0.1)] text-[hsl(24_95%_53%)]"
                    : "border-border bg-input text-foreground hover:bg-muted")
                }
              >
                <Bike size={16} /> Motorcycle
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...filters, vehicleType: "car" })}
                className={
                  "flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition " +
                  (filters.vehicleType === "car"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-foreground hover:bg-muted")
                }
              >
                <Car size={16} /> Car / Bus
              </button>
            </div>
          </section>

          {/* Connector + Speed only for car */}
          {isCar && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <Plug size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Connector type</h3>
                  {filters.connectors.length > 0 && (
                    <button
                      onClick={() => onChange({ ...filters, connectors: [] })}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_CONNECTORS.map((c) => (
                    <Chip
                      key={c}
                      active={filters.connectors.includes(c)}
                      onClick={() =>
                        onChange({ ...filters, connectors: toggle(filters.connectors, c) })
                      }
                    >
                      {c}
                    </Chip>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Empty = show all connectors.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <Zap size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Charging speed</h3>
                  {filters.speeds.length > 0 && (
                    <button
                      onClick={() => onChange({ ...filters, speeds: [] })}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_SPEEDS.map((s) => (
                    <Chip
                      key={s}
                      active={filters.speeds.includes(s)}
                      onClick={() =>
                        onChange({ ...filters, speeds: toggle(filters.speeds, s) })
                      }
                    >
                      {SPEED_LABEL[s]} <span className="opacity-60 ml-1">{SPEED_KW[s]}</span>
                    </Chip>
                  ))}
                </div>
              </section>
            </>
          )}

          {!isCar && (
            <section className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Battery swap stations don't use connectors. Only station type and distance filters apply.
            </section>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-border flex gap-2">
          <button
            onClick={() => onChange(DEFAULT_FILTERS(filters.vehicleType))}
            className="flex-1 h-11 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition"
          >
            Reset
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
          >
            Apply
          </button>
        </footer>
      </SheetContent>
    </Sheet>
  );
};