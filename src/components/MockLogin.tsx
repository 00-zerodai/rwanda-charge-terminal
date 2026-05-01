import { useState } from "react";
import { storage, MockUser } from "@/lib/storage";
import { TerminalButton } from "./TerminalButton";
import { Zap } from "lucide-react";

export const MockLogin = ({ onLogin }: { onLogin: (u: MockUser) => void }) => {
  const [name, setName] = useState("");
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background bg-grid">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl p-7 shadow-elevated">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-5">
            <Zap size={22} fill="currentColor" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Welcome to ChargeFinder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find EV charging stations across Rwanda.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const u = { username: (name.trim() || "guest").slice(0, 24) };
              storage.setUser(u);
              onLogin(u);
            }}
          >
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                Display name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="w-full bg-input border border-border px-3.5 py-2.5 text-sm text-foreground rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </label>
            <TerminalButton type="submit" variant="green" size="lg" className="w-full">
              Continue
            </TerminalButton>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Local session only · no password required
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          v0.1.0 · built for Kigali
        </p>
      </div>
    </div>
  );
};
