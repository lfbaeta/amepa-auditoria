import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSectors, createSector, updateSector, deleteSector,
  listQuestions, createQuestion, updateQuestion, deleteQuestion,
} from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Pencil, Plus, Trash2, Loader2, AlertTriangle, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/setores_/gerenciar")({
  validateSearch: z.object({
    specialtyId: z.string().uuid().optional(),
  }),
  component: ManagePage,
  head: () => ({ meta: [{ title: "Gerenciar setores — Auditorias SCIRAS" }] }),
});

function ManagePage() {
  const { specialtyId } = Route.useSearch();
  const qc = useQueryClient();
  const fetchSectors = useServerFn(listSectors);
  const sectors = useQuery({ queryKey: ["sectors", specialtyId], queryFn: () => fetchSectors({ data: { specialtyId } }) });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild><Link to="/setores"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Gerenciar setores</h1>
        </div>
        <SectorDialog onSaved={() => qc.invalidateQueries({ queryKey: ["sectors"] })} />
      </div>

      {sectors.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {(sectors.data ?? []).map((s) => (
            <AccordionItem key={s.id} value={s.id} className={`rounded-2xl border bg-card px-4 ${s.is_critical ? "border-destructive/30" : ""}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{s.name}</p>
                    {s.is_critical && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3" /> Crítico
                      </span>
                    )}
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <SectorBody sectorId={s.id} sectorName={s.name} sectorDescription={s.description} sectorIsCritical={s.is_critical} />
              </AccordionContent>
            </AccordionItem>
          ))}

        </Accordion>
      )}
    </div>
  );
}

function SectorBody({ sectorId, sectorName, sectorDescription, sectorIsCritical }: { sectorId: string; sectorName: string; sectorDescription: string | null; sectorIsCritical: boolean }) {
  const qc = useQueryClient();
  const fetchQ = useServerFn(listQuestions);
  const createFn = useServerFn(createQuestion);
  const updateFn = useServerFn(updateQuestion);
  const deleteFn = useServerFn(deleteQuestion);
  const delSector = useServerFn(deleteSector);
  const updSector = useServerFn(updateSector);

  const qs = useQuery({ queryKey: ["questions", sectorId], queryFn: () => fetchQ({ data: { sectorId } }) });
  const [newText, setNewText] = useState("");
  const [newCode, setNewCode] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string; code: string | null } | null>(null);

  const create = useMutation({
    mutationFn: () => createFn({ data: { sectorId, text: newText, code: newCode || null } }),
    onSuccess: () => { setNewText(""); setNewCode(""); qc.invalidateQueries({ queryKey: ["questions", sectorId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; text: string; code: string | null }) => updateFn({ data: v }),
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: ["questions", sectorId] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions", sectorId] }),
  });
  const removeSec = useMutation({
    mutationFn: () => delSector({ data: { id: sectorId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sectors"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-3 pt-2">
      <div className="flex justify-between gap-2">
        <SectorDialog
          initial={{ id: sectorId, name: sectorName, description: sectorDescription ?? "", isCritical: sectorIsCritical }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["sectors"] }); }}
          trigger={<Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar setor</Button>}
          onUpdate={async (v) => { await updSector({ data: { id: sectorId, name: v.name, description: v.description, isCritical: v.isCritical } }); }}
        />

        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
          if (confirm("Excluir este setor? Auditorias deste setor permanecem no histórico.")) removeSec.mutate();
        }}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
        </Button>
      </div>

      <ul className="divide-y rounded-xl border bg-secondary/40">
        {(qs.data ?? []).map((q) => (
          <li key={q.id} className="p-3 flex items-start gap-3">
            <span className="text-xs font-mono text-muted-foreground pt-0.5 w-12 shrink-0">{q.code || "—"}</span>
            <p className="text-sm flex-1">{q.text}</p>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing({ id: q.id, text: q.text, code: q.code })}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Excluir pergunta?")) remove.mutate(q.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
        {(qs.data ?? []).length === 0 && <li className="p-4 text-sm text-muted-foreground text-center">Nenhuma pergunta.</li>}
      </ul>

      <div className="rounded-xl border bg-card p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Nova pergunta</p>
        <div className="flex gap-2">
          <Input placeholder="Cód." value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-20" />
          <Input placeholder="Texto da pergunta" value={newText} onChange={(e) => setNewText(e.target.value)} />
        </div>
        <Button size="sm" disabled={!newText.trim() || create.isPending} onClick={() => create.mutate()}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar pergunta</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Código</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Texto</Label><Textarea value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={4} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={update.isPending}>Cancelar</Button>
            <Button onClick={() => editing && update.mutate({ id: editing.id, text: editing.text, code: editing.code })} disabled={update.isPending || !editing?.text.trim()}>
              {update.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectorDialog({
  initial, onSaved, trigger, onUpdate,
}: {
  initial?: { id: string; name: string; description: string; isCritical: boolean };
  onSaved: () => void;
  trigger?: React.ReactNode;
  onUpdate?: (v: { name: string; description: string; isCritical: boolean }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isCritical, setIsCritical] = useState(initial?.isCritical ?? false);
  const createFn = useServerFn(createSector);
  const mut = useMutation({
    mutationFn: async () => {
      if (initial && onUpdate) { await onUpdate({ name, description, isCritical }); }
      else { await createFn({ data: { name, description: description || null, isCritical } }); }
    },
    onSuccess: () => { setOpen(false); if (!initial) { setName(""); setDescription(""); setIsCritical(false); } onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar setor" : "Novo setor"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${isCritical ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <Label htmlFor="critical-switch" className="cursor-pointer">Setor crítico</Label>
                <p className="text-[11px] text-muted-foreground">Destaca no painel e conta NC críticas.</p>
              </div>
            </div>
            <Switch id="critical-switch" checked={isCritical} onCheckedChange={setIsCritical} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || mut.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

