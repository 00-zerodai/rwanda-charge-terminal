import { ArrowLeft, ArrowRight, Building2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { PLAN_OPTIONS } from "@/lib/pricing";

const Pricing = () => {
  const { t } = useLanguage();

  return (
    <main className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Volta</p>
            <h1 className="text-xl font-semibold text-foreground">{t("Pricing")}</h1>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft size={16} />
            {t("Back to map")}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-12">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t("For station owners")}
          </p>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("Plans for growing your charging network")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("Choose a monthly plan for your station. You can manage plan selection in the Owner portal.")}
          </p>
        </section>

        <section aria-label={t("Pricing plans")} className="grid gap-4 md:grid-cols-3">
          {PLAN_OPTIONS.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-center gap-2 text-primary">
                <Building2 size={17} />
                <h3 className="text-base font-semibold text-foreground">{t(plan.name)}</h3>
              </div>
              <p className="mt-5 text-2xl font-bold text-foreground">{plan.price}</p>
              <p className="mt-3 min-h-12 flex-1 text-sm leading-relaxed text-muted-foreground">
                {t(plan.features)}
              </p>
              <Link
                to="/owner"
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 px-3 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                {t("Visit Owner portal")}
                <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </section>

        <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {t("Payment through the app is coming soon. Selecting a plan does not charge you or activate paid features yet.")}
        </p>

        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <MapPin size={19} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">{t("Charging prices are set by each station")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Open a station on the map to see its current charging or battery-swap price.")}
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("View charging stations")}
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </main>
  );
};

export default Pricing;
