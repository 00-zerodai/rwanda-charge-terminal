import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CircleHelp, LogOut, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddStationDialog } from "@/components/AddStationDialog";
import { TerminalButton } from "@/components/TerminalButton";
import { supabase } from "@/integrations/supabase/client";
import { deleteCommunityStation, useCommunityStations } from "@/lib/community-stations";
import { formatRwf, Station } from "@/lib/stations";
import { useLanguage } from "@/lib/i18n";
import type { Tables } from "@/integrations/supabase/types";
import { SupportAssistantDialog } from "@/components/SupportAssistantDialog";

const PLAN_OPTIONS = [
  {
    id: "starter",
    name: "Starter",
    price: "20,000 RWF/mo",
    features: "Verified pin + direct phone/WhatsApp button",
  },
  {
    id: "pro_host",
    name: "Pro Host",
    price: "145,000 RWF/mo",
    features: "Live Available/Busy toggle + photos + top map ranking",
  },
  {
    id: "network",
    name: "Network",
    price: "300,000+ RWF/mo",
    features: "Multi-charger management + monthly driver analytics",
  },
] as const;

export default function OwnerPortal({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const stations = useCommunityStations().filter((station) => station.ownerId === userId);
  const [notifications, setNotifications] = useState<Tables<"station_owner_notifications">[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});
  const [slotDrafts, setSlotDrafts] = useState<Record<string, string>>({});
  const [savingPlanStationId, setSavingPlanStationId] = useState<string | null>(null);
  const [savingSlotsStationId, setSavingSlotsStationId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("station_owner_notifications")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        if (active) toast.error(t("Couldn't load owner notifications"), { description: error.message });
        return;
      }
      if (active) setNotifications(data ?? []);
    };

    void loadNotifications();
    const channel = supabase
      .channel(`station-owner-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "station_owner_notifications", filter: `owner_id=eq.${userId}` },
        () => void loadNotifications(),
      )
      .subscribe((status) => {
        if (active && status === "CHANNEL_ERROR") {
          toast.error(t("Live station updates are unavailable"));
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, t]);

  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      const { data, error } = await supabase
        .from("station_plan_selections")
        .select("station_id, plan")
        .eq("owner_id", userId);
      if (error) {
        if (active) toast.error(t("Couldn't load plan selections"), { description: error.message });
        return;
      }
      if (active) {
        setSelectedPlans(Object.fromEntries((data ?? []).map(({ station_id, plan }) => [station_id, plan])));
      }
    };

    void loadPlans();
    return () => {
      active = false;
    };
  }, [userId, t]);

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

  const markNotificationRead = async (notificationId: string) => {
    const { error } = await supabase.rpc("mark_station_notification_read", {
      p_notification_id: notificationId,
    });
    if (error) {
      toast.error(t("Couldn't update notification"), { description: error.message });
      return;
    }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
          : notification,
      ),
    );
  };

  const choosePlan = async (stationId: string, plan: string) => {
    setSavingPlanStationId(stationId);
    try {
      const { error } = await supabase.rpc("select_station_plan", {
        p_station_id: stationId,
        p_plan: plan,
      });
      if (error) throw error;
      setSelectedPlans((current) => ({ ...current, [stationId]: plan }));
      toast.success(t("Plan saved"), {
        description: t("Payment through the app is coming soon. Selecting a plan does not charge you or activate paid features yet."),
      });
    } catch (error) {
      toast.error(t("Couldn't select plan"), {
        description: error instanceof Error ? error.message : t("Please try again."),
      });
    } finally {
      setSavingPlanStationId(null);
    }
  };

  const saveAvailableSlots = async (stationId: string, totalSlots: number) => {
    const rawValue = slotDrafts[stationId] ?? String(
      stations.find((station) => station.id === stationId)?.availableSlots ?? 0,
    );
    const availableSlots = Number(rawValue);
    if (
      !Number.isInteger(availableSlots) ||
      availableSlots < 0 ||
      availableSlots > totalSlots
    ) {
      toast.error(t("Enter valid total and available slots."));
      return;
    }

    setSavingSlotsStationId(stationId);
    const { error } = await supabase
      .from("community_stations")
      .update({ available_slots: availableSlots })
      .eq("id", stationId)
      .eq("owner_id", userId);
    if (error) {
      toast.error(t("Couldn't update available slots"), { description: error.message });
    } else {
      setSlotDrafts((current) => ({ ...current, [stationId]: String(availableSlots) }));
      toast.success(t("Availability updated"));
    }
    setSavingSlotsStationId(null);
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
              onClick={() => setShowHelp(true)}
              aria-label={t("Help and support")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 text-sm text-foreground hover:bg-muted sm:px-3"
            >
              <CircleHelp size={15} /> <span className="hidden sm:inline">{t("Help")}</span>
            </button>
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

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">{t("Driver activity")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Direction requests show interest, but don't confirm arrival or charging.")}
              </p>
            </div>
            {notifications.some((notification) => !notification.read_at) && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {notifications.filter((notification) => !notification.read_at).length} {t("new")}
              </span>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="mt-4 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
              {t("No driver activity yet. We'll notify you when someone requests directions to one of your stations.")}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-lg border p-3 ${notification.read_at ? "border-border bg-muted/20" : "border-primary/30 bg-primary/5"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{notification.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                      <time className="mt-2 block text-[11px] text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </time>
                    </div>
                    {!notification.read_at && (
                      <button
                        type="button"
                        onClick={() => void markNotificationRead(notification.id)}
                        className="shrink-0 text-xs font-medium text-primary hover:underline"
                      >
                        {t("Mark as read")}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

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
                className="space-y-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
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
                </div>

                <section className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">
                        {t(station.kind === "swap-moto" ? "Available service slots" : "Available charging slots")}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {station.availableSlots ?? 0} / {station.totalSlots ?? 1} {t("available now")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`${t("Available now")} — ${station.name}`}
                        className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                        type="number"
                        min="0"
                        max={station.totalSlots ?? 1}
                        step="1"
                        value={slotDrafts[station.id] ?? String(station.availableSlots ?? 0)}
                        onChange={(event) =>
                          setSlotDrafts((current) => ({ ...current, [station.id]: event.target.value }))
                        }
                      />
                      <TerminalButton
                        variant="ghost"
                        size="sm"
                        disabled={savingSlotsStationId === station.id}
                        onClick={() => void saveAvailableSlots(station.id, station.totalSlots ?? 1)}
                      >
                        {savingSlotsStationId === station.id ? t("Saving...") : t("Save availability")}
                      </TerminalButton>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{t("Choose a plan")}</h4>
                    <span className="text-[11px] text-muted-foreground">{t("Payment through the app is coming soon. Selecting a plan does not charge you or activate paid features yet.")}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {PLAN_OPTIONS.map((plan) => {
                      const isSelected = selectedPlans[station.id] === plan.id;
                      return (
                        <div
                          key={plan.id}
                          className={`rounded-lg border p-3 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-sm font-semibold text-foreground">{plan.name}</h5>
                            {isSelected && <span className="text-[10px] font-medium text-primary">{t("Selected · Payment coming soon")}</span>}
                          </div>
                          <p className="mt-1 text-sm font-bold text-primary">{plan.price}</p>
                          <p className="mt-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{t(plan.features)}</p>
                          <button
                            type="button"
                            disabled={isSelected || savingPlanStationId === station.id}
                            onClick={() => void choosePlan(station.id, plan.id)}
                            className="mt-3 w-full rounded-lg border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:cursor-default disabled:opacity-70"
                          >
                            {savingPlanStationId === station.id ? t("Saving...") : isSelected ? t("Selected · Payment coming soon") : t("Select plan")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
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
      <SupportAssistantDialog open={showHelp} onOpenChange={setShowHelp} />
    </main>
  );
}
