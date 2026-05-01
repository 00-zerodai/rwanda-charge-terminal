import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download, Share, Plus, Zap } from "lucide-react";

const SHOW_DELAY_MS = 30_000;

export const InstallPrompt = () => {
  const { platform, canShow, promptInstall, dismiss, hasNativePrompt } = useInstallPrompt();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canShow) return;
    const t = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [canShow]);

  const handleClose = (next: boolean) => {
    if (!next) {
      dismiss();
      setOpen(false);
    }
  };

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result !== "unavailable") setOpen(false);
  };

  if (!canShow || platform === "none") return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-2xl border-t border-border max-h-[85vh]"
      >
        <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        <div className="px-5 pb-6 pt-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Zap size={22} fill="currentColor" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold leading-tight">
                Install Volta
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Get faster access from your home screen — works like a real app.
              </SheetDescription>
            </div>
          </div>

          {platform === "ios" ? (
            <div className="space-y-3">
              <ol className="space-y-2.5 text-sm text-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center">
                    1
                  </span>
                  <span className="flex-1 flex items-center gap-1.5 flex-wrap">
                    Tap the
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary border border-border">
                      <Share size={14} className="text-primary" />
                      <span className="text-xs">Share</span>
                    </span>
                    icon in Safari's toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center">
                    2
                  </span>
                  <span className="flex-1 flex items-center gap-1.5 flex-wrap">
                    Choose
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary border border-border">
                      <Plus size={14} className="text-primary" />
                      <span className="text-xs font-medium">Add to Home Screen</span>
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center">
                    3
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    Tap <span className="text-foreground font-medium">Add</span> — Volta will appear on your home screen.
                  </span>
                </li>
              </ol>
              <button
                onClick={() => {
                  dismiss();
                  setOpen(false);
                }}
                className="w-full h-11 mt-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <ul className="space-y-1.5 text-sm text-muted-foreground mb-3">
                <li>• Launches fullscreen, no browser bars</li>
                <li>• One tap from your home screen</li>
                <li>• Saved stations stay between visits</li>
              </ul>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    dismiss();
                    setOpen(false);
                  }}
                  className="h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition border border-border"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  disabled={!hasNativePrompt}
                  className="h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download size={16} /> Install
                </button>
              </div>
              {!hasNativePrompt && (
                <p className="text-[11px] text-muted-foreground/80 text-center pt-1">
                  Open the browser menu and tap "Install app" or "Add to Home Screen".
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};