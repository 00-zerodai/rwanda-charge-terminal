import { useCallback, useEffect, useState } from "react";
import { isIOS, isAndroid, isStandalone, isInIframe } from "@/lib/platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cf_install_dismissed_at";
const INSTALLED_KEY = "cf_installed";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type InstallPlatform = "android" | "ios" | "none";

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>("none");
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInIframe()) return; // skip in Lovable preview / share preview
    if (isStandalone()) return; // already installed
    if (localStorage.getItem(INSTALLED_KEY) === "true") return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) return;

    if (isIOS) {
      setPlatform("ios");
      setCanShow(true);
    } else if (isAndroid) {
      setPlatform("android");
      // wait for beforeinstallprompt
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setCanShow(true);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setCanShow(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setCanShow(false);
    return outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setCanShow(false);
  }, []);

  return { platform, canShow, promptInstall, dismiss, hasNativePrompt: !!deferred };
}