import { useState } from "react";
import { Station } from "@/lib/stations";
import { StatusBadge } from "./Terminal";
import { TerminalButton } from "./TerminalButton";
import { useLocalState, SavedStation, ChargeHistoryEntry } from "@/lib/storage";
import { ChargingFlow } from "./ChargingFlow";
import { X, Star, MapPin, Navigation, Zap, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";

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

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  const openNavigation = () => {
    try {
      const w = window.open(navUrl, "_blank", "noopener,noreferrer");
      if (!w) {
        // Popup blocked — fall back to top-level navigation
        window.location.href = navUrl;
      }
    } catch {
      window.location.href = navUrl;
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md sm:m-4 max-h-[92vh] overflow-auto bg-card border border-border sm:rounded-2xl rounded-t-2xl shadow-elevated animate-[boot_0.25s_ease-out]"
      >
        {flow ? (
          <div className="p-5 relative">
            <button
              className="absolute right-3 top-3 z-10 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <ChargingFlow station={station} onDone={() => setFlow(false)} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative p-5 pb-4 border-b border-border">
              <button
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="flex items-start gap-3 pr-8">
                <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Zap size={20} fill="currentColor" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground leading-tight truncate">
                    {station.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
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

            {/* Body */}
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

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <TerminalButton variant="green" size="lg" onClick={() => setFlow(true)} className="col-span-2">
                  <Zap size={16} /> Start charging
                </TerminalButton>

                <button
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

                <a
                  href={navUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition pt-1"
                >
                  <ExternalLink size={12} /> Open in Google Maps
                </a>
              </div>
            </div>
          </>
        )}
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
