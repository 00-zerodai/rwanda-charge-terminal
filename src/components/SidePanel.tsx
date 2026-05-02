import { useLocalState, SavedStation, ChargeHistoryEntry } from "@/lib/storage";
import { TerminalButton } from "./TerminalButton";
import { Station, classifyStation } from "@/lib/stations";
import { X, MapPin, Clock, LogOut, Trash2 } from "lucide-react";

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
    <div className="fixed inset-0 z-30 flex animate-[fade-in_0.2s_ease-out]" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm h-full bg-card border-l border-border overflow-y-auto shadow-elevated"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Your account</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-7">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Saved stations</h3>
              <span className="text-xs text-muted-foreground">{saved.length}</span>
            </div>
            <ul className="space-y-2">
              {saved.length === 0 && (
                <li className="text-sm text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">
                  No saved stations yet
                </li>
              )}
              {saved.map((s) => (
                <li key={s.id}>
                  <div className="flex items-start gap-2 group p-3 border border-border bg-muted/20 hover:bg-muted/40 rounded-xl transition">
                    <button
                      onClick={() => {
                        onSelect({
                          ...s,
                          source: s.custom ? "custom" : "google",
                          status: "online",
                          kind: s.kind ?? classifyStation(s.name),
                        });
                        onClose();
                      }}
                      className="flex items-start gap-3 text-left flex-1 min-w-0"
                    >
                      <MapPin
                        size={16}
                        className={s.custom ? "text-[hsl(var(--success))] mt-0.5 shrink-0" : "text-primary mt-0.5 shrink-0"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.address || "—"}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setSaved(saved.filter((x) => x.id !== s.id))}
                      className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Charging history</h3>
              <span className="text-xs text-muted-foreground">{history.length}</span>
            </div>
            <ul className="space-y-2">
              {history.length === 0 && (
                <li className="text-sm text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">
                  No charging sessions yet
                </li>
              )}
              {history.map((h) => (
                <li key={h.id} className="border border-border bg-muted/20 p-3 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Clock size={14} className="text-[hsl(var(--warning))] mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{h.stationName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(h.date).toLocaleString()}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs">
                        <span className="text-primary font-medium">{h.kwh} kWh</span>
                        <span className="text-foreground">{h.amountRwf.toLocaleString()} RWF</span>
                        <span className="text-muted-foreground">· {h.method}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <TerminalButton
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => {
                localStorage.removeItem("cf_user");
                location.reload();
              }}
            >
              <LogOut size={16} /> Log out
            </TerminalButton>
          </section>
        </div>
      </div>
    </div>
  );
};
