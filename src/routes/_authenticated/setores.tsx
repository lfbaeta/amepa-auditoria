import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSectors, startAudit } from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, ChevronRight, ClipboardCheck, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/setores")({
  validateSearch: z.object({
    specialtyId: z.string().uuid().optional(),
  }),
  component: SetoresPage,
  head: () => ({ meta: [{ title: "Setores — Auditorias SCIRAS" }] }),
});

function SetoresPage() {
  const { specialtyId } = Route.useSearch();
  const fetchSectors = useServerFn(listSectors);
  const startFn = useServerFn(startAudit);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["sectors", specialtyId], queryFn: () => fetchSectors({ data: { specialtyId } }) });
  const [openId, setOpenId] = useState<string | null>(null);
  const [auditor, setAuditor] = useState("");
  const [responsible, setResponsible] = useState("");

  const start = useMutation({
    mutationFn: (sectorId: string) => startFn({ data: { sectorId, auditorName: auditor || undefined, sectorResponsible: responsible || undefined } }),
    onSuccess: (audit) => {
      qc.invalidateQueries({ queryKey: ["audits"] });
      navigate({ to: "/auditoria/$id", params: { id: audit.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link to="/especialidades"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Setores</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Escolha o setor para iniciar uma nova auditoria.</p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/setores/gerenciar" search={{ specialtyId }}><Settings className="h-4 w-4 mr-1.5" /> Configurações</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((s) => (
            <li key={s.id}>
              <Dialog open={openId === s.id} onOpenChange={(o) => { setOpenId(o ? s.id : null); if (!o) { setAuditor(""); setResponsible(""); } }}>
                <DialogTrigger asChild>
                  <button className={`w-full text-left rounded-2xl border bg-card p-4 hover:shadow-sm transition-all flex items-center gap-3 ${s.is_critical ? "border-destructive/40 hover:border-destructive" : "hover:border-primary/40"}`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${s.is_critical ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {s.is_critical ? <AlertTriangle className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{s.name}</p>
                        {s.is_critical && (
                          <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5 shrink-0">Crítico</span>
                        )}
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader><DialogTitle>Iniciar auditoria — {s.name}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="auditor">Avaliador(es)</Label>
                      <Input id="auditor" value={auditor} onChange={(e) => setAuditor(e.target.value)} placeholder="Seu nome" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="resp">Responsável pelo setor</Label>
                      <Input id="resp" value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Opcional" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => start.mutate(s.id)} disabled={start.isPending}>
                      {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Começar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
