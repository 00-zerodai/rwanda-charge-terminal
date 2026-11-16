import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  LocateFixed,
  Navigation,
  Route as RouteIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { RouteResult } from "@/lib/directions";
import { distanceMeters, formatDistance, type Station } from "@/lib/stations";
import { useLanguage } from "@/lib/i18n";

type NavigationRoute = Pick<
  RouteResult,
  "distanceText" | "durationText" | "distanceMeters" | "durationSeconds" | "steps"
>;

const plainText = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";

const stepDistance = (position: { lat: number; lng: number }, step: NavigationRoute["steps"][number]) =>
  step.path.length
    ? step.path.reduce((nearest, point) => Math.min(nearest, distanceMeters(position, point)), Infinity)
    : distanceMeters(position, step.endLocation);

export const NavigationPanel = ({
  station,
  route,
  userLocation,
  error,
  mapsUrl,
  onEnd,
}: {
  station: Station;
  route: NavigationRoute | null;
  userLocation: { lat: number; lng: number } | null;
  error: string | null;
  mapsUrl: string;
  onEnd: () => void;
}) => {
  const { language, t } = useLanguage();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const lastInstructionRef = useRef<string | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  const arrivalAnnouncedRef = useRef(false);

  const activeStepIndex = useMemo(() => {
    if (!route?.steps.length || !userLocation) return 0;
    return route.steps.reduce(
      (nearestIndex, step, index) =>
        stepDistance(userLocation, step) < stepDistance(userLocation, route.steps[nearestIndex])
          ? index
          : nearestIndex,
      0,
    );
  }, [route, userLocation]);

  const activeStep = route?.steps[activeStepIndex];
  const instruction = activeStep ? plainText(activeStep.instruction) : "";
  const metersToManeuver =
    userLocation && activeStep ? distanceMeters(userLocation, activeStep.endLocation) : null;
  const arrived =
    userLocation !== null &&
    distanceMeters(userLocation, { lat: station.lat, lng: station.lng }) <= 45;
  const stepKey = activeStep
    ? `${instruction}:${activeStep.endLocation.lat.toFixed(3)},${activeStep.endLocation.lng.toFixed(3)}`
    : "";
  const arrivalTime =
    route && route.durationSeconds > 0
      ? new Date(Date.now() + route.durationSeconds * 1000).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;
    setVoiceSupported(supported);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!voiceEnabled || !voiceSupported || !activeStep || arrived || !stepKey) return;

    const speak = (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "rw" ? "rw-RW" : "en-US";
      window.speechSynthesis.speak(utterance);
    };

    if (lastInstructionRef.current !== stepKey) {
      lastInstructionRef.current = stepKey;
      lastPromptRef.current = null;
      speak(instruction);
      return;
    }

    if (metersToManeuver === null) return;
    const promptStage = metersToManeuver <= 60 ? "now" : metersToManeuver <= 250 ? "soon" : null;
    const promptKey = promptStage ? `${stepKey}:${promptStage}` : null;
    if (!promptStage || lastPromptRef.current === promptKey) return;

    lastPromptRef.current = promptKey;
    speak(
      promptStage === "now"
        ? `${t("At the next turn")}, ${instruction}`
        : `${t("In")} ${formatDistance(metersToManeuver)}, ${instruction}`,
    );
  }, [
    activeStep,
    arrived,
    instruction,
    language,
    metersToManeuver,
    stepKey,
    t,
    voiceEnabled,
    voiceSupported,
  ]);

  useEffect(() => {
    if (!arrived || !voiceEnabled || !voiceSupported || arrivalAnnouncedRef.current) return;
    arrivalAnnouncedRef.current = true;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${t("You have arrived at")} ${station.name}`);
    utterance.lang = language === "rw" ? "rw-RW" : "en-US";
    window.speechSynthesis.speak(utterance);
  }, [arrived, language, station.name, t, voiceEnabled, voiceSupported]);

  const toggleVoice = () => {
    if (voiceEnabled) {
      window.speechSynthesis?.cancel();
      setVoiceEnabled(false);
      return;
    }
    setVoiceEnabled(true);
    if (voiceSupported) {
      const utterance = new SpeechSynthesisUtterance(t("Voice guidance on"));
      utterance.lang = language === "rw" ? "rw-RW" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextStep = route?.steps[activeStepIndex + 1];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
      <div className="pointer-events-auto space-y-3">
        <header className="flex items-center justify-between gap-3 self-start rounded-2xl border border-border bg-card/95 p-3 shadow-elevated backdrop-blur-md">
          <button
            type="button"
            onClick={onEnd}
            aria-label={t("End navigation")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("Navigating to")}
            </p>
            <h2 className="truncate text-sm font-semibold text-foreground">{station.name}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-2 text-xs font-medium text-primary">
            <LocateFixed size={14} />
            {userLocation ? t("GPS on") : t("Waiting for GPS")}
          </div>
        </header>

        <section className="rounded-2xl border border-teal-900/20 bg-teal-800 text-white shadow-elevated">
          <div className="flex items-start gap-4 p-4 sm:p-5">
            <Navigation
              size={32}
              className="mt-1 shrink-0"
              style={{
                transform: instruction.toLowerCase().includes("left")
                  ? "rotate(-90deg)"
                  : instruction.toLowerCase().includes("right")
                    ? "rotate(90deg)"
                    : undefined,
              }}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-white/75">
                {arrived ? t("Destination reached") : t("Next maneuver")}
              </p>
              <h3 className="mt-1 text-lg font-semibold leading-snug sm:text-xl">
                {arrived
                  ? t("You have arrived")
                  : instruction || (error ? t("Location needed for in-app guidance") : t("Finding your route..."))}
              </h3>
              {!arrived && metersToManeuver !== null && activeStep && (
                <p className="mt-1 text-sm text-white/85">
                  {formatDistance(metersToManeuver)} · {activeStep.distanceText}
                </p>
              )}
              {error && <p role="status" className="mt-2 text-xs text-white/85">{t(error)}</p>}
              {!arrived && nextStep && (
                <p className="mt-3 border-t border-white/20 pt-2 text-sm text-white/85">
                  {t("Then")}: {plainText(nextStep.instruction)}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="pointer-events-auto max-h-[45vh] w-full self-center overflow-y-auto rounded-2xl border border-border bg-card/95 shadow-elevated backdrop-blur-md sm:max-w-lg">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {arrived ? "✓" : route?.durationText || "—"}
              </span>
              {arrivalTime && !arrived && (
                <span className="text-sm text-muted-foreground">{t("Arrive")} {arrivalTime}</span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 size={13} />
              {arrived
                ? station.name
                : route?.distanceText
                  ? `${route.distanceText} ${t("remaining")}`
                  : t("Waiting for route")}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleVoice}
            disabled={!voiceSupported}
            aria-label={t(voiceEnabled ? "Mute voice guidance" : "Unmute voice guidance")}
            aria-pressed={voiceEnabled && voiceSupported}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted disabled:opacity-40"
          >
            {voiceEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
        </div>

        {!voiceSupported && (
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            {t("This browser cannot speak directions. Use Google Maps for voice guidance.")}
          </p>
        )}

        <div className="flex flex-col gap-2 p-3 sm:flex-row">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink size={16} />
            {t("Start in Google Maps")}
          </a>
          <button
            type="button"
            onClick={() => setShowSteps((show) => !show)}
            aria-expanded={showSteps}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            <RouteIcon size={15} />
            {t("Directions")}
            {showSteps ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {showSteps && route?.steps.length ? (
          <ol className="space-y-1 border-t border-border p-3">
            {route.steps.map((step, index) => (
              <li
                key={`${index}-${step.endLocation.lat}-${step.endLocation.lng}`}
                className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm ${
                  index === activeStepIndex ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                }`}
                aria-current={index === activeStepIndex ? "step" : undefined}
              >
                {index === activeStepIndex ? <Navigation size={15} className="mt-0.5 shrink-0" /> : <RouteIcon size={15} className="mt-0.5 shrink-0" />}
                <span className="min-w-0 flex-1">{plainText(step.instruction)}</span>
                <span className="shrink-0 text-xs">{step.distanceText}</span>
              </li>
            ))}
          </ol>
        ) : showSteps ? (
          <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
            {error
              ? t("Enable location access to get directions here, or open Google Maps.")
              : t("Google Maps directions will appear here once your location is found.")}
          </p>
        ) : null}

        {arrived && (
          <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm font-medium text-primary">
            <CheckCircle2 size={17} />
            {station.name}
          </p>
        )}
      </section>
    </div>
  );
};
