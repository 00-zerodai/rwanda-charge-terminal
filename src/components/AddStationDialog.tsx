import { useState } from "react";
import { TerminalButton } from "./TerminalButton";
import { useLocalState, SavedStation } from "@/lib/storage";
import { X, MapPin, Locate, Car, Bike } from "lucide-react";

export const AddStationDialog = ({ onClose }: { onClose: () => void }) => {
  const [, setCustom] = useLocalState<SavedStation[]>("cf_custom_stations", []);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [kind, setKind] = useState<"ev-car" | "swap-moto">("ev-car");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!name.trim()) return setErr("Name is required");
    if (Number.isNaN(la) || Number.isNaN(ln)) return setErr("Invalid coordinates");
    setCustom((prev) => [
      ...prev,
      {
        id: "custom-" + crypto.randomUUID().slice(0, 8),
        name: name.trim().slice(0, 60),
        address: address.trim().slice(0, 120),
        lat: la,
        lng: ln,
        custom: true,
        kind,
      },
    ]);
    onClose();
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setErr("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        setErr(null);
      },
      () => setErr("Permission denied"),
    );
  };

  const inputCls =
    "w-full bg-input border border-border px-3 py-2.5 text-sm text-foreground rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-elevated animate-[boot_0.25s_ease-out]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <h2 className="text-base font-semibold text-foreground">Add a station</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">
              Station name
            </span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Kigali Heights EV Hub"
            />
          </label>
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Type</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("ev-car")}
                className={
                  "flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition " +
                  (kind === "ev-car"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-foreground hover:bg-muted")
                }
              >
                <Car size={16} /> EV charger
              </button>
              <button
                type="button"
                onClick={() => setKind("swap-moto")}
                className={
                  "flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition " +
                  (kind === "swap-moto"
                    ? "border-[hsl(24_95%_53%)] bg-[hsl(24_95%_53%/0.1)] text-[hsl(24_95%_53%)]"
                    : "border-border bg-input text-foreground hover:bg-muted")
                }
              >
                <Bike size={16} /> Battery swap
              </button>
            </div>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Address</span>
            <input
              className={inputCls}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={120}
              placeholder="Street, neighborhood"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Latitude</span>
              <input
                className={inputCls}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-1.9501"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Longitude</span>
              <input
                className={inputCls}
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="30.0588"
              />
            </label>
          </div>
          {err && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <TerminalButton type="submit" variant="green" size="lg" className="flex-1">
              Save station
            </TerminalButton>
            <TerminalButton type="button" variant="ghost" size="lg" onClick={useMyLocation}>
              <Locate size={16} /> GPS
            </TerminalButton>
          </div>
        </form>
      </div>
    </div>
  );
};
