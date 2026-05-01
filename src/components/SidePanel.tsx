import { useLocalState, SavedStation, ChargeHistoryEntry } from "@/lib/storage";
import { TerminalLine } from "./Terminal";
import { TerminalButton } from "./TerminalButton";
import { Station } from "@/lib/stations";
import { X, MapPin, Clock } from "lucide-react";

export const SidePanel = ({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (s: Station) => void;
}) => {
  const [saved, setSaved] = useLocalState<SavedStation[]>("cf_saved_stations", []);
  const [history] = useLocalState<ChargeHistoryEntry[]>("cf_history", []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex animate-fade-in" onClick={onClose}>
      <div className="flex-1 bg-background/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm h-full bg-card border-l border-border overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs text-dim">~/profile</span>
          <button onClick={onClose} className="text-dim hover:text-neon-green"><X size={16} /></button>
        </div>

        <div className="p-3 space-y-6">
          <section>
            <TerminalLine tone="cyan">ls saved/ <span className="text-dim">// {saved.length} entries</span></TerminalLine>
            <ul className="mt-2 space-y-1.5">
              {saved.length === 0 && (
                <li className="text-xs text-dim pl-4">// no saved stations yet</li>
              )}
              {saved.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      onSelect({
                        ...s,
                        source: s.custom ? "custom" : "google",
                        status: "online",
                      });
                      onClose();
                    }}
                    className="w-full text-left flex items-start gap-2 group p-2 border border-transparent hover:border-border hover:bg-muted/30 rounded-sm transition"
                  >
                    <MapPin size={14} className={s.custom ? "text-neon-cyan mt-0.5" : "text-neon-green mt-0.5"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-neon-green truncate group-hover:glow-green">{s.name}</div>
                      <div className="text-xs text-dim truncate">{s.address || "—"}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSaved(saved.filter((x) => x.id !== s.id)); }}
                      className="text-dim hover:text-destructive text-xs"
                    >
                      [x]
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <TerminalLine tone="cyan">cat history.log <span className="text-dim">// {history.length} sessions</span></TerminalLine>
            <ul className="mt-2 space-y-1.5">
              {history.length === 0 && (
                <li className="text-xs text-dim pl-4">// no charging sessions yet</li>
              )}
              {history.map((h) => (
                <li key={h.id} className="border border-border bg-muted/20 p-2 rounded-sm">
                  <div className="flex items-start gap-2">
                    <Clock size={12} className="text-neon-amber mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neon-green truncate">{h.stationName}</div>
                      <div className="text-[11px] text-dim">
                        {new Date(h.date).toLocaleString()} · <span className="text-neon-cyan">{h.kwh} kWh</span> · {h.amountRwf.toLocaleString()} RWF
                      </div>
                      <div className="text-[10px] text-dim">via {h.method}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <TerminalButton variant="ghost" size="sm" onClick={() => { localStorage.removeItem("cf_user"); location.reload(); }}>
              LOGOUT
            </TerminalButton>
          </section>
        </div>
      </div>
    </div>
  );
};