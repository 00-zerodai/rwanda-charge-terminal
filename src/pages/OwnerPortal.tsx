import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, LogOut, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddStationDialog } from "@/components/AddStationDialog";
import { TerminalButton } from "@/components/TerminalButton";
import { supabase } from "@/integrations/supabase/client";
import { deleteCommunityStation, useCommunityStations } from "@/lib/community-stations";
import { formatRwf, Station } from "@/lib/stations";
import { useLanguage } from "@/lib/i18n";

export default function OwnerPortal({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const stations = useCommunityStations().filter((station) => station.ownerId === userId);

  const removeStation = async (station: Station) => {
    if (!window.confirm(`${t("Remove")} "${station.name}"?`)) return;
    try {
      const cleanupWarning = await deleteCommunityStation(station.id);
      if (cleanupWarning) {
        toast.warning(t("Station removed, but some photos couldn't be deleted"), {
          description: cleanupWarning,
        });
        return;
      }
      toast.success(t("Station removed"));
    } catch (error) {
      toast.error(t("Couldn't remove station"), {
        description: error instanceof Error ? error.message : t("Please try again."),
      });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("Couldn't sign out"), { description: error.message });
      return;
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">{t("Station owner portal")}</h1>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="inline-flex items-center rounded-lg border border-border px-3 text-sm text-foreground hover:bg-muted">
              {t("View map")}
            </Link>
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "rw" : "en")}
              className="rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              {language === "en" ? "RW" : "EN"}
            </button>
            <TerminalButton variant="ghost" onClick={signOut}>
              <LogOut size={15} /> {t("Sign out")}
            </TerminalButton>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl space-y-6 p-4 py-8 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{t("Your stations")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Add a charging or battery-swap station with its GPS location and current price. New stations are shared on the Volta map.")}
            </p>
          </div>
          <TerminalButton variant="green" size="lg" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> {t("Add station")}
          </TerminalButton>
        </div>

        <div className="space-y-3">
          {stations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
              <MapPin className="mx-auto text-muted-foreground" size={28} />
              <h3 className="mt-3 font-medium text-foreground">{t("No stations yet")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Use “Add station” to publish your first location and price.")}
              </p>
            </div>
          ) : (
            stations.map((station) => (
              <article
                key={station.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {station.photoUrls?.[0] ? (
                    <img
                      src={station.photoUrls[0]}
                      alt={`${station.name} charging station`}
                      className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <MapPin className="mt-1 shrink-0 text-primary" size={18} />
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-foreground">{station.name}</h3>
                    <p className="text-sm text-muted-foreground">{station.address || t("Address not provided")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(station.kind === "swap-moto" ? "Battery swap" : "EV charger")} ·{" "}
                      {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
                    </p>
                    {station.photoUrls && station.photoUrls.length > 1 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {station.photoUrls.length} {t("photos")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-primary">
                    {station.kind === "swap-moto"
                      ? `${formatRwf(station.swapPrice ?? 0)} / swap`
                      : `${formatRwf(station.pricePerKwh ?? 0)} / kWh`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeStation(station)}
                    aria-label={`Remove ${station.name}`}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {showAdd && (
        <AddStationDialog
          userId={userId}
          allowPhotoUpload
          onClose={() => setShowAdd(false)}
        />
      )}
    </main>
  );
}
