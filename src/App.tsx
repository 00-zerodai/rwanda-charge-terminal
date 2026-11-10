import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import OwnerPortal from "./pages/OwnerPortal.tsx";
import NotFound from "./pages/NotFound.tsx";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AuthPage } from "@/components/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { LanguageProvider, useLanguage } from "@/lib/i18n";

const queryClient = new QueryClient();

const AuthenticatedRoutes = () => {
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Couldn't restore the Supabase session", error);
        toast.error(t("Couldn't restore your account session"), { description: error.message });
      }
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">{t("Loading your account...")}</div>;
  }
  if (!session) return <AuthPage />;

  const user = {
    username: String(
      session.user.user_metadata.display_name ??
      session.user.email?.split("@")[0] ??
      "User",
    ),
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Index user={user} userId={session.user.id} />} />
        <Route
          path="/owner"
          element={
            <OwnerPortal
              userId={session.user.id}
              email={session.user.email ?? user.username}
            />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <InstallPrompt />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <BrowserRouter>
          <AuthenticatedRoutes />
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
