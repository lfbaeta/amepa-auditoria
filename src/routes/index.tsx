import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ArrowRight, Loader2 } from "lucide-react";
import { SettingsButton } from "@/lib/theme";

export const Route = createFileRoute("/")({
  ssr: false,
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "Bem-vindo — Auditoria AME" },
      { name: "description", content: "Seja bem-vindo à Auditoria AME. Entre para registrar auditorias internas." },
    ],
  }),
});

function WelcomePage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/especialidades", replace: true });
      } else {
        setChecking(false);
        requestAnimationFrame(() => setVisible(true));
      }
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary p-6 relative overflow-hidden">
      <div className="absolute top-3 right-3 z-10"><SettingsButton /></div>

      <div
        className={`w-full max-w-md text-center transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <ClipboardCheck className="h-10 w-10" />
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Seja Bem Vindo
        </h1>
        <p className="mt-2 text-xl font-semibold text-primary">
          à Auditoria AME
        </p>
        <p className="mt-4 text-sm text-muted-foreground max-w-sm mx-auto">
          Sistema de gestão de auditorias internas SCIRAS — registre não conformidades, acompanhe indicadores e gere relatórios em PDF.
        </p>

        <Button
          size="lg"
          className="mt-8 h-12 px-8 text-base shadow-md"
          onClick={() => navigate({ to: "/auth" })}
        >
          Entrar no sistema
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <p className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} SCIRAS · Auditoria AME
        </p>
      </div>
    </div>
  );
}
