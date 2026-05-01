import { useEffect, useState } from "react";
import { storage, MockUser } from "@/lib/storage";
import { MockLogin } from "@/components/MockLogin";
import { StationMap } from "@/components/StationMap";
import { StationSheet } from "@/components/StationSheet";
import { Station } from "@/lib/stations";
import { TerminalButton } from "@/components/TerminalButton";
import { AddStationDialog } from "@/components/AddStationDialog";
import { SidePanel } from "@/components/SidePanel";
import { Plus, User, Zap, RefreshCw } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";

const Index = () => {
  const [user, setUser] = useState<MockUser | null>(() => storage.getUser());
  const apiKey = GOOGLE_MAPS_API_KEY;
  const [selected, setSelected] = useState<Station | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!user) return <MockLogin onLogin={setUser} />;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Zap size={16} className="text-neon-green shrink-0" fill="currentColor" />
            <h1 className="font-display text-sm sm:text-base font-bold text-neon-green glow-green truncate">
              ChargeFinder<span className="text-neon-cyan">_RW</span>
            </h1>
            <span className="hidden sm:inline text-xs text-dim ml-2">v0.1.0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TerminalButton variant="ghost" size="sm" onClick={() => setRefresh((r) => r + 1)} bracket={false} aria-label="refresh">
              <RefreshCw size={12} />
            </TerminalButton>
            <TerminalButton variant="cyan" size="sm" onClick={() => setShowAdd(true)} bracket={false}>
              <Plus size={12} /> ADD
            </TerminalButton>
            <TerminalButton variant="green" size="sm" onClick={() => setShowPanel(true)} bracket={false}>
              <User size={12} /> {user.username}
            </TerminalButton>
          </div>
        </div>
        {/* Status strip */}
        <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] text-dim font-mono">
          <span>
            <span className="text-neon-green">●</span> CONNECTED :: <span className="text-neon-cyan">gmaps.live</span>
          </span>
          <span className="hidden xs:inline">kigali · -1.95, 30.06</span>
          <span>{time.toLocaleTimeString("en-GB")}</span>
        </div>
      </header>

      {/* Map */}
      <main className="flex-1 relative p-2 sm:p-3">
        <StationMap apiKey={apiKey} onSelect={setSelected} refreshKey={refresh} />

        {/* Legend */}
        <div className="pointer-events-none absolute right-3 bottom-3 sm:right-5 sm:bottom-5 terminal-box bg-background/90 px-2.5 py-1.5 text-[10px] sm:text-xs space-y-0.5 z-10">
          <div className="flex items-center gap-2"><span className="text-neon-green">⚡</span><span className="text-dim">google.places</span></div>
          <div className="flex items-center gap-2"><span className="text-neon-cyan">⚡</span><span className="text-dim">custom.local</span></div>
        </div>
      </main>

      {/* Footer hint */}
      <footer className="border-t border-border bg-card/60 px-3 py-1.5 text-[10px] text-dim font-mono flex items-center justify-between">
        <span className="terminal-prompt">tap a pin to inspect station<span className="animate-blink">▊</span></span>
        <span className="hidden sm:inline">simulated payments · no real transactions</span>
      </footer>

      {/* Overlays */}
      <StationSheet station={selected} onClose={() => setSelected(null)} />
      {showAdd && <AddStationDialog onClose={() => setShowAdd(false)} />}
      <SidePanel open={showPanel} onClose={() => setShowPanel(false)} onSelect={setSelected} />
    </div>
  );
};

export default Index;
