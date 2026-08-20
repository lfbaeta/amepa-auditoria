import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudits } from "@/lib/audit.functions";
import { AlertTriangle, CalendarDays, ChevronRight, Loader2, Plus, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
  head: () => ({ meta: [{ title: "Agenda — Auditorias SCIRAS" }] }),
});

type AuditRow = {
  id: string;
  sector_id: string;
  sector_name: string;
  is_critical: boolean;
  auditor_name: string | null;
  audit_date: string;
  status: string;
  conformity_score: number | null;
  c_count: number;
  nc_count: number;
  na_count: number;
};

function AgendaPage() {
  const fetchA = useServerFn(listAudits);
  const audits = useQuery({ queryKey: ["audits"], queryFn: () => fetchA() });
  const [filter, setFilter] = useState<"all" | "finalizada" | "em_andamento">("all");

  const grouped = useMemo(() => {
    const rows = ((audits.data ?? []) as AuditRow[]).filter((a) =>
      filter === "all" ? true : a.status === filter,
    );
    const map = new Map<string, AuditRow[]>();
    for (const a of rows) {
      const arr = map.get(a.audit_date) ?? [];
      arr.push(a);
      map.set(a.audit_date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [audits.data, filter]);

  const totalCount = (audits.data ?? []).length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda de auditorias</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Todas as auditorias organizadas por data.</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/setores"><Plus className="h-4 w-4 mr-1" /> Nova</Link>
        </Button>
      </div>

      <div className="flex gap-1.5">
        {(
          [
            { k: "all", l: `Todas (${totalCount})` },
            { k: "finalizada", l: "Finalizadas" },
            { k: "em_andamento", l: "Em andamento" },
          ] as const
        ).map((o) => (
          <button
            key={o.k}
            onClick={() => setFilter(o.k)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filter === o.k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>

      {audits.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma auditoria salva ainda.</p>
          <Button asChild size="sm" className="mt-4"><Link to="/setores">Iniciar auditoria</Link></Button>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => {
            const d = new Date(date + "T00:00:00");
            const label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
            const ncTotal = items.reduce((acc, a) => acc + (a.nc_count ?? 0), 0);
            return (
              <section key={date}>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <h2 className="text-sm font-semibold capitalize">{label}</h2>
                  <span className="text-[11px] text-muted-foreground">
                    {items.length} auditoria{items.length > 1 ? "s" : ""}{ncTotal > 0 ? ` · ${ncTotal} NC` : ""}
                  </span>
                </div>
                <ul className="space-y-2">
                  {items.map((a) => {
                    const finalizada = a.status === "finalizada";
                    const score = a.conformity_score != null ? `${Number(a.conformity_score).toFixed(0)}%` : "—";
                    return (
                      <li key={a.id}>
                        <Link
                          to={finalizada ? "/auditoria/$id/resumo" : "/auditoria/$id"}
                          params={{ id: a.id }}
                          className={`flex items-center gap-3 rounded-2xl border bg-card p-3.5 hover:shadow-sm transition-all ${a.is_critical ? "border-destructive/30 hover:border-destructive/60" : "hover:border-primary/40"}`}
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                            finalizada ? (a.is_critical ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary") : "bg-warning/15 text-warning-foreground"
                          }`}>
                            {finalizada ? (a.is_critical ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />) : <Clock className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium truncate">{a.sector_name}</p>
                              {a.is_critical && (
                                <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5">Crítico</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[11px] text-muted-foreground">
                                {finalizada ? score : "Em andamento"}
                                {a.auditor_name ? ` · ${a.auditor_name}` : ""}
                              </p>
                              {finalizada && (
                                <span className="text-[11px] text-muted-foreground">
                                  · <b className="text-success">{a.c_count}</b>/<b className="text-destructive">{a.nc_count}</b>/<b>{a.na_count}</b>
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
