import { useState } from "react";
import { storage, MockUser } from "@/lib/storage";
import { MockLogin } from "@/components/MockLogin";
import { StationMap } from "@/components/StationMap";
import { StationSheet } from "@/components/StationSheet";
import { Station } from "@/lib/stations";
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

  if (!user) return <MockLogin onLogin={setUser} />;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md z-20">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Zap size={18} fill="currentColor" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground leading-tight truncate">
                ChargeFinder
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Rwanda · EV stations</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRefresh((r) => r + 1)}
              aria-label="Refresh"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 text-sm font-medium border border-border transition"
            >
              <Plus size={16} /> <span className="hidden xs:inline">Add</span>
            </button>
            <button
              onClick={() => setShowPanel(true)}
              className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3 text-sm font-medium transition"
            >
              <User size={16} />
              <span className="hidden sm:inline truncate max-w-[100px]">{user.username}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <section className="relative flex-1 min-h-[48vh] lg:min-h-0 p-3 pb-0 lg:p-3">
          <StationMap apiKey={apiKey} onSelect={setSelected} refreshKey={refresh} />

          <div className="pointer-events-none absolute right-6 bottom-3 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2 text-xs space-y-1 shadow-soft z-10">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Public stations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-muted-foreground">Community added</span>
            </div>
          </div>
        </section>

        <StationSheet station={selected} onClose={() => setSelected(null)} />
      </main>

      {/* Overlays */}
      {showAdd && <AddStationDialog onClose={() => setShowAdd(false)} />}
      <SidePanel open={showPanel} onClose={() => setShowPanel(false)} onSelect={setSelected} />
    </div>
  );
};

export default Index;
