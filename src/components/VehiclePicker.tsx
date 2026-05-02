import { Bike, Car, Zap } from "lucide-react";

export type VehicleType = "moto" | "car";

export const VehiclePicker = ({
  onPick,
}: {
  onPick: (v: VehicleType) => void;
}) => {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4">
            <Zap size={22} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">What are you using?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We'll show you the right stations for your vehicle.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onPick("moto")}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card hover:border-[hsl(24_95%_53%)] hover:bg-[hsl(24_95%_53%/0.08)] transition p-6 text-center"
          >
            <div className="h-14 w-14 rounded-2xl bg-[hsl(24_95%_53%/0.15)] text-[hsl(24_95%_53%)] flex items-center justify-center">
              <Bike size={28} />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">Motorcycle</div>
              <div className="text-xs text-muted-foreground mt-1">Battery swap stations (Spiro, Ampersand)</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onPick("car")}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition p-6 text-center"
          >
            <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <Car size={28} />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">Car / Bus</div>
              <div className="text-xs text-muted-foreground mt-1">EV charging stations (Kabisa, public chargers)</div>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          You can switch this anytime from the top bar.
        </p>
      </div>
    </div>
  );
};