import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudits, listSectors, deleteAudit } from "@/lib/audit.functions";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/historico")({
  component: HistoricoPage,
  head: () => ({ meta: [{ title: "Histórico — Auditorias SCIRAS" }] }),
});

function HistoricoPage() {
  const fetchA = useServerFn(listAudits);
  const fetchS = useServerFn(listSectors);
  const audits = useQuery({ queryKey: ["audits"], queryFn: () => fetchA() });
  const sectors = useQuery({ queryKey: ["sectors"], queryFn: () => fetchS({ data: {} }) });
  const [sectorId, setSectorId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const qc = useQueryClient();
  const del = useServerFn(deleteAudit);
  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Auditoria excluída");
      qc.invalidateQueries({ queryKey: ["audits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (audits.data ?? []).filter((a) => {
      if (sectorId !== "all" && a.sector_id !== sectorId) return false;
      if (from && a.audit_date < from) return false;
      if (to && a.audit_date > to) return false;
      return true;
    });
  }, [audits.data, sectorId, from, to]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Auditorias realizadas, filtradas por data e setor.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Select value={sectorId} onValueChange={setSectorId}>
            <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {(sectors.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
      </div>

      {audits.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Nenhuma auditoria encontrada.</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => {
            const finalizada = a.status === "finalizada";
            const score = a.conformity_score != null ? `${Number(a.conformity_score).toFixed(0)}%` : "—";
            return (
              <li key={a.id} className="relative">
                <Link
                  to={finalizada ? "/auditoria/$id/resumo" : "/auditoria/$id"}
                  params={{ id: a.id }}
                  className="block rounded-2xl border bg-card p-4 pr-14 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">{a.sector_name}</p>
                        {a.is_critical && (
                          <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5">Crítico</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(a.audit_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        {a.auditor_name ? ` · ${a.auditor_name}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${
                      finalizada ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning-foreground"
                    }`}>
                      {finalizada ? score : "Em andamento"}
                    </span>
                  </div>

                  {finalizada && (
                    <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span><b className="text-success">{a.c_count}</b> C</span>
                      <span><b className="text-destructive">{a.nc_count}</b> NC</span>
                      <span><b>{a.na_count}</b> NA</span>
                    </div>
                  )}
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Excluir auditoria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir auditoria?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A auditoria de <b>{a.sector_name}</b> ({new Date(a.audit_date + "T00:00:00").toLocaleDateString("pt-BR")}) e todas as suas respostas serão removidas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeMut.mutate(a.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
