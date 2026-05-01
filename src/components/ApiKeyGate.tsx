import { useState } from "react";
import { storage } from "@/lib/storage";
import { TerminalWindow, TerminalLine, Typewriter } from "./Terminal";
import { TerminalButton } from "./TerminalButton";

export const ApiKeyGate = ({ onSet }: { onSet: (k: string) => void }) => {
  const [val, setVal] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid">
      <div className="w-full max-w-lg">
        <TerminalWindow title="volta@kigali:~/init">
          <TerminalLine tone="green">
            <Typewriter text="Initializing Volta v0.1.0..." speed={14} />
          </TerminalLine>
          <TerminalLine tone="cyan">
            <span className="text-dim">[INFO]</span> Google Maps API key required to fetch live EV stations.
          </TerminalLine>
          <TerminalLine tone="amber">
            <span className="text-dim">[NOTE]</span> Stored locally in your browser. Never sent to our servers.
          </TerminalLine>
          <div className="mt-4 space-y-2">
            <label className="block text-xs uppercase text-dim tracking-widest">$ enter_api_key</label>
            <input
              type="password"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-input border border-border px-3 py-2 text-sm text-neon-green font-mono outline-none focus:border-neon-green focus:shadow-glow-green rounded-sm"
              autoFocus
            />
            <div className="flex gap-2 pt-2">
              <TerminalButton
                variant="green"
                size="lg"
                disabled={val.trim().length < 10}
                onClick={() => {
                  storage.setApiKey(val.trim());
                  onSet(val.trim());
                }}
              >
                CONNECT
              </TerminalButton>
              <TerminalButton
                variant="ghost"
                size="lg"
                onClick={() => {
                  storage.setApiKey("DEMO");
                  onSet("DEMO");
                }}
              >
                SKIP_DEMO_MODE
              </TerminalButton>
            </div>
            <p className="text-xs text-dim pt-2">
              <span className="text-neon-cyan">help:</span> Get a key at{" "}
              <a
                className="text-neon-green underline underline-offset-2"
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noreferrer"
              >
                Google Cloud Console
              </a>
              . Enable Maps JavaScript API + Places API.
            </p>
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
};