import { FormEvent, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TerminalButton } from "./TerminalButton";
import { useLanguage } from "@/lib/i18n";

export const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const isOwnerPortal = location.pathname === "/owner";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success(t("Account created"), {
            description: t("Check your email to confirm your account, then sign in."),
          });
          setIsSignUp(false);
          return;
        }
        toast.success(t("Account created"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(t(isSignUp ? "Couldn't create your account" : "Couldn't sign in"), {
        description: error instanceof Error ? error.message : t("Please try again."),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background bg-grid">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "rw" : "en")}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            {language === "en" ? "Kinyarwanda" : "English"}
          </button>
        </div>
        <div className="bg-card border border-border rounded-2xl p-7 shadow-elevated">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-5">
            <Zap size={22} fill="currentColor" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {t(isOwnerPortal ? "Station owner portal" : "Welcome to Volta")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwnerPortal
              ? t("Sign in or create an account to manage your stations.")
              : t("Sign in to find and add EV charging stations across Rwanda.")}
          </p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {isSignUp && (
              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("Your name")}
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={60}
                  required
                  className="w-full bg-input border border-border px-3.5 py-2.5 text-sm text-foreground rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </label>
            )}
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">{t("Email")}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full bg-input border border-border px-3.5 py-2.5 text-sm text-foreground rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("Password")}
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
                required
                className="w-full bg-input border border-border px-3.5 py-2.5 text-sm text-foreground rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </label>
            <TerminalButton type="submit" variant="green" size="lg" className="w-full" disabled={busy}>
              {busy ? t("Please wait...") : isSignUp ? t("Create account") : t("Sign in")}
            </TerminalButton>
          </form>
          <button
            type="button"
            onClick={() => setIsSignUp((value) => !value)}
            className="mt-4 w-full text-sm text-primary hover:underline"
          >
            {t(isSignUp ? "Already have an account? Sign in" : "New to Volta? Create an account")}
          </button>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {isOwnerPortal ? (
              <Link to="/" className="text-primary hover:underline">{t("Back to Volta")}</Link>
            ) : (
              <Link to="/owner" className="text-primary hover:underline">{t("Station owner portal")}</Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
