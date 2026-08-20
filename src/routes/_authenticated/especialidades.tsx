import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSpecialties } from "@/lib/audit.functions";
import { ClipboardCheck, ArrowRight, Loader2, Stethoscope, Wrench, Shield, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/especialidades")({
  component: SpecialtiesPage,
  head: () => ({ meta: [{ title: "Especialidades — Auditorias SCIRAS" }] }),
});

const ICON_MAP: Record<string, any> = {
  stethoscope: Stethoscope,
  wrench: Wrench,
  shield: Shield,
  briefcase: Briefcase,
};

function SpecialtiesPage() {
  const fetchS = useServerFn(listSpecialties);
  const { data: specialties, isLoading } = useQuery({
    queryKey: ["specialties"],
    queryFn: () => fetchS(),
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Especialidades</h1>
        <p className="text-muted-foreground">Selecione sua área de atuação para continuar.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(specialties ?? []).map((s) => {
            const Icon = ICON_MAP[s.icon || ""] || ClipboardCheck;
            return (
              <Link
                key={s.id}
                to="/setores"
                search={{ specialtyId: s.id }}
                className="group relative flex flex-col items-center justify-center rounded-3xl border bg-card p-8 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">{s.name}</h3>
                {s.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {s.description}
                  </p>
                )}
                <div className="mt-6 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Selecionar <ArrowRight className="ml-1.5 h-3 w-3" />
                </div>
              </Link>
            );
          })}

          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center text-muted-foreground bg-secondary/20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground/50">
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold">Outra Área?</h3>
            <p className="mt-2 text-sm">
              Novas especialidades podem ser configuradas pelo administrador.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
