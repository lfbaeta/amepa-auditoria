import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuditWithResponses } from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { generateAuditPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/auditoria/$id/resumo")({
  component: ResumoPage,
  head: () => ({ meta: [{ title: "Resumo da auditoria" }] }),
});

const statusBadge: Record<string, { label: string; cls: string }> = {
  C: { label: "Conforme", cls: "bg-success/15 text-success" },
  NC: { label: "Não Conforme", cls: "bg-destructive/15 text-destructive" },
  NA: { label: "N/A", cls: "bg-muted text-muted-foreground" },
};

function ResumoPage() {
  const { id } = Route.useParams();
  const fetchFn = useServerFn(getAuditWithResponses);
  const { data, isLoading } = useQuery({ queryKey: ["audit", id], queryFn: () => fetchFn({ data: { id } }) });

  if (isLoading || !data) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const a = data.audit;
  const score = a.conformity_score != null ? Number(a.conformity_score).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild><Link to="/historico"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="text-lg font-semibold truncate flex-1">Resumo</h1>
      </div>

      <div className="rounded-2xl border bg-gradient-to-br from-primary to-[#3C82DC] text-primary-foreground p-5">
        <p className="text-sm opacity-90">{a.sector_name}</p>
        <p className="text-4xl font-bold mt-2">{score}{a.conformity_score != null && "%"}</p>
        <p className="text-xs opacity-90 mt-1">Conformidade</p>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="rounded-xl bg-white/15 py-2"><p className="text-lg font-semibold">{a.c_count}</p><p className="text-[10px] opacity-90 uppercase">Conforme</p></div>
          <div className="rounded-xl bg-white/15 py-2"><p className="text-lg font-semibold">{a.nc_count}</p><p className="text-[10px] opacity-90 uppercase">Não Conf.</p></div>
          <div className="rounded-xl bg-white/15 py-2"><p className="text-lg font-semibold">{a.na_count}</p><p className="text-[10px] opacity-90 uppercase">N/A</p></div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 text-sm space-y-1.5">
        <Row k="Data" v={new Date(a.audit_date + "T00:00:00").toLocaleDateString("pt-BR")} />
        <Row k="Avaliador" v={a.auditor_name || "—"} />
        <Row k="Responsável" v={a.sector_responsible || "—"} />
        <Row k="Status" v={a.status === "finalizada" ? "Finalizada" : "Em andamento"} />
      </div>

      <Button className="w-full h-11" onClick={() => generateAuditPdf(a, data.responses)}>
        <Download className="h-4 w-4 mr-2" /> Baixar PDF
      </Button>

      <div className="rounded-2xl border bg-card divide-y">
        {data.responses.map((r) => (
          <div key={r.id} className="p-3 flex gap-3">
            <span className="text-xs font-mono text-muted-foreground pt-0.5 w-10 shrink-0">{r.question_code_snapshot || "—"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{r.question_text_snapshot}</p>
              {r.comment && <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>}
            </div>
            {r.status && (
              <span className={`text-[10px] font-semibold rounded-full px-2 py-1 h-fit shrink-0 ${statusBadge[r.status].cls}`}>
                {statusBadge[r.status].label}
              </span>
            )}
          </div>
        ))}
      </div>

      {a.notes && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Observações gerais</p>
          <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
