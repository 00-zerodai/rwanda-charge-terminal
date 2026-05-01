import { useState } from "react";
import { storage, MockUser } from "@/lib/storage";
import { TerminalWindow, TerminalLine, Typewriter } from "./Terminal";
import { TerminalButton } from "./TerminalButton";

export const MockLogin = ({ onLogin }: { onLogin: (u: MockUser) => void }) => {
  const [name, setName] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid">
      <div className="w-full max-w-md">
        <TerminalWindow title="auth@chargefinder:~/login">
          <TerminalLine tone="cyan">
            <Typewriter text="ChargeFinder Rwanda // Access Terminal" speed={12} cursor={false} />
          </TerminalLine>
          <TerminalLine tone="dim">
            <Typewriter text="No password required — local session only." speed={10} cursor={false} />
          </TerminalLine>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const u = { username: (name.trim() || "guest").slice(0, 24) };
              storage.setUser(u);
              onLogin(u);
            }}
          >
            <label className="block">
              <span className="block text-[10px] uppercase tracking-widest text-dim mb-1">$ login --as</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="username"
                autoFocus
                className="w-full bg-input border border-border px-3 py-2 text-sm text-neon-green font-mono outline-none focus:border-neon-green focus:shadow-glow-green rounded-sm"
              />
            </label>
            <TerminalButton type="submit" variant="green" size="lg" className="w-full">
              ENTER
            </TerminalButton>
          </form>
        </TerminalWindow>
        <p className="mt-4 text-center text-xs text-dim">
          v0.1.0 // built for kigali · expanding to 🇷🇼 nationwide
        </p>
      </div>
    </div>
  );
};