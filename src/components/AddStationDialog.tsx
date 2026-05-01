import { useState } from "react";
import { TerminalWindow, TerminalLine } from "./Terminal";
import { TerminalButton } from "./TerminalButton";
import { useLocalState, SavedStation } from "@/lib/storage";
import { X } from "lucide-react";

export const AddStationDialog = ({ onClose }: { onClose: () => void }) => {
  const [, setCustom] = useLocalState<SavedStation[]>("cf_custom_stations", []);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!name.trim()) return setErr("name required");
    if (Number.isNaN(la) || Number.isNaN(ln)) return setErr("invalid coordinates");
    setCustom((prev) => [
      ...prev,
      {
        id: "custom-" + crypto.randomUUID().slice(0, 8),
        name: name.trim().slice(0, 60),
        address: address.trim().slice(0, 120),
        lat: la,
        lng: ln,
        custom: true,
      },
    ]);
    onClose();
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setErr("geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
      },
      () => setErr("permission denied"),
    );
  };

  const inputCls =
    "w-full bg-input border border-border px-2 py-1.5 text-sm text-neon-green font-mono outline-none focus:border-neon-green focus:shadow-glow-green rounded-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <TerminalWindow title="add_station --new">
          <button className="absolute right-2 top-2 z-10 text-dim hover:text-neon-green" onClick={onClose}>
            <X size={16} />
          </button>
          <TerminalLine tone="cyan">INSERT INTO stations VALUES (...)</TerminalLine>
          <form onSubmit={submit} className="mt-3 space-y-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-dim block mb-1">$ name</span>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-dim block mb-1">$ address</span>
              <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-dim block mb-1">$ lat</span>
                <input className={inputCls} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.9501" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-dim block mb-1">$ lng</span>
                <input className={inputCls} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="30.0588" />
              </label>
            </div>
            {err && <TerminalLine tone="amber">ERR :: {err}</TerminalLine>}
            <div className="flex gap-2">
              <TerminalButton type="submit" variant="green" size="lg">SAVE</TerminalButton>
              <TerminalButton type="button" variant="cyan" size="lg" onClick={useMyLocation}>
                USE_GPS
              </TerminalButton>
            </div>
          </form>
        </TerminalWindow>
      </div>
    </div>
  );
};