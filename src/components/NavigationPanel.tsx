import { useMemo } from "react";
import { ArrowLeft, ExternalLink, LocateFixed, Navigation, Route } from "lucide-react";
import type { RouteResult } from "@/lib/directions";
import { distanceMeters, Station } from "@/lib/stations";
import { useLanguage } from "@/lib/i18n";

type NavigationRoute = Pick<RouteResult, "distanceText" | "durationText" | "steps">;

const plainText = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";

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
  const { t } = useLanguage();

  const activeStepIndex = useMemo(() => {
    if (!route?.steps.length || !userLocation) return 0;
    return route.steps.reduce(
      (nearestIndex, step, index) =>
        distanceMeters(userLocation, step.endLocation) <
        distanceMeters(userLocation, route.steps[nearestIndex].endLocation)
          ? index
          : nearestIndex,
      0,
    );
  }, [route, userLocation]);

  const activeStep = route?.steps[activeStepIndex];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
      <header className="pointer-events-auto flex items-center justify-between gap-3 self-start rounded-2xl border border-border bg-card/95 p-3 shadow-elevated backdrop-blur-md">
        <button
          type="button"
          onClick={onEnd}
          aria-label={t("End navigation")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
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

      <section className="pointer-events-auto max-h-[52vh] w-full overflow-hidden self-center rounded-2xl border border-border bg-card/95 shadow-elevated backdrop-blur-md sm:max-w-lg">
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Navigation size={19} />
          </div>
          <div className="min-w-0 flex-1">
            {activeStep ? (
              <>
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  {plainText(activeStep.instruction)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{activeStep.distanceText}</p>
              </>
            ) : error ? (
              <h3 className="text-sm font-semibold text-foreground">{t("Location needed for in-app guidance")}</h3>
            ) : (
              <h3 className="text-sm font-semibold text-foreground">{t("Finding your route...")}</h3>
            )}
            {route && (
              <p className="mt-2 text-sm font-semibold text-primary">
                {route.durationText}
                {route.distanceText ? ` · ${route.distanceText}` : ""}
              </p>
            )}
            {error && <p role="status" className="mt-2 text-xs text-destructive">{t(error)}</p>}
          </div>
        </div>

        <div className="max-h-44 overflow-y-auto p-3">
          {route?.steps.length ? (
            <ol className="space-y-1">
              {route.steps.map((step, index) => (
                <li
                  key={`${index}-${step.endLocation.lat}-${step.endLocation.lng}`}
                  className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm ${
                    index === activeStepIndex ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                  }`}
                  aria-current={index === activeStepIndex ? "step" : undefined}
                >
                  <span className="mt-0.5 shrink-0">
                    {index === activeStepIndex ? <Navigation size={15} /> : <Route size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">{plainText(step.instruction)}</span>
                  <span className="shrink-0 text-xs">{step.distanceText}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {error
                ? t("Enable location access to get directions here, or open Google Maps.")
                : t("Google Maps directions will appear here once your location is found.")}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border p-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink size={14} />
            {t("Open in Google Maps")}
          </a>
          <span className="text-[10px] text-muted-foreground">{t("Routes by Google Maps")}</span>
        </footer>
      </section>
    </div>
  );
};
