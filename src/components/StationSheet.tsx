import { useState } from "react";
import { Station } from "@/lib/stations";
import { TerminalWindow, TerminalLine, StatusBadge, Typewriter } from "./Terminal";
import { TerminalButton } from "./TerminalButton";
import { useLocalState, SavedStation, ChargeHistoryEntry } from "@/lib/storage";
import { ChargingFlow } from "./ChargingFlow";
import { X, Star } from "lucide-react";

export const StationSheet = ({ station, onClose }: { station: Station | null; onClose: () => void }) => {
  const [saved, setSaved] = useLocalState<SavedStation[]>("cf_saved_stations", []);
  const [flow, setFlow] = useState(false);

  if (!station) return null;

  const isSaved = saved.some((s) => s.id === station.id);

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
        },
      ]);
  };

  const navigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg sm:m-4 max-h-[90vh] overflow-auto"
      >
        <TerminalWindow title={`station@${station.id.slice(0, 10)}`}>
          <button
            className="absolute right-2 top-2 z-10 text-dim hover:text-neon-green"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {flow ? (
            <ChargingFlow station={station} onDone={() => setFlow(false)} />
          ) : (
            <>
              <TerminalLine tone="cyan">
                <Typewriter text={`SELECT * FROM stations WHERE id='${station.id.slice(0, 8)}';`} speed={8} cursor={false} />
              </TerminalLine>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-dim">name</span>
                  <span className="text-neon-green font-bold glow-green">{station.name}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-dim">address</span>
                  <span className="text-foreground/90">{station.address || "—"}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-dim">status</span>
                  <StatusBadge status={station.status} />
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-dim">rating</span>
                  <span className="flex items-center gap-1 text-neon-amber">
                    {station.rating ? (
                      <>
                        <Star size={12} fill="currentColor" /> {station.rating.toFixed(1)} / 5.0
                      </>
                    ) : (
                      <span className="text-dim">N/A</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-dim">source</span>
                  <span className={station.source === "google" ? "text-neon-green" : "text-neon-cyan"}>
                    {station.source === "google" ? "google.places" : "custom.local"}
                  </span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-dim">coords</span>
                  <span className="text-dim text-xs">
                    {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <TerminalButton variant="green" size="lg" onClick={() => setFlow(true)}>
                  START_CHARGING
                </TerminalButton>
                <TerminalButton variant="cyan" size="lg" onClick={navigate}>
                  NAVIGATE
                </TerminalButton>
                <TerminalButton variant={isSaved ? "amber" : "ghost"} size="lg" onClick={toggleSave}>
                  {isSaved ? "UNSAVE" : "SAVE"}
                </TerminalButton>
              </div>
            </>
          )}
        </TerminalWindow>
      </div>
    </div>
  );
};

export function logChargeSession(entry: ChargeHistoryEntry) {
  const raw = localStorage.getItem("cf_history");
  const list: ChargeHistoryEntry[] = raw ? JSON.parse(raw) : [];
  list.unshift(entry);
  localStorage.setItem("cf_history", JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new StorageEvent("storage", { key: "cf_history" }));
}