import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  listAudits,
  listSectors,
  getAuditWithResponses,
  exportBackupData,
  importBackupData,
} from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { Database, Download, FileJson, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dados")({
  component: DadosPage,
  head: () => ({ meta: [{ title: "Gestão de dados — SCIRAS" }] }),
});

function DadosPage() {
  const fetchA = useServerFn(listAudits);
  const fetchS = useServerFn(listSectors);
  const fetchAudit = useServerFn(getAuditWithResponses);
  const fetchBackup = useServerFn(exportBackupData);
  const importFn = useServerFn(importBackupData);
  const audits = useQuery({ queryKey: ["audits"], queryFn: () => fetchA() });
  const sectors = useQuery({ queryKey: ["sectors"], queryFn: () => fetchS({ data: {} }) });

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportBackup() {
    try {
      setExporting(true);
      const { sectors: allSectors, questions: allQuestions } = await fetchBackup();
      const all = audits.data ?? [];
      const full = await Promise.all(all.map((a) => fetchAudit({ data: { id: a.id } })));

      const sectorsWithQuestions = allSectors.map((s) => ({
        name: s.name,
        description: s.description,
        icon: s.icon,
        is_critical: s.is_critical,
        sort_order: s.sort_order,
        questions: allQuestions
          .filter((q) => q.sector_id === s.id)
          .map((q) => ({
            code: q.code,
            text: q.text,
            sort_order: q.sort_order,
            active: q.active,
          })),
      }));

      const payload = {
        version: 2,
        generated_at: new Date().toISOString(),
        sectors: sectorsWithQuestions,
        audits: full,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-auditorias-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Backup baixado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no backup");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File) {
    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.sectors || !Array.isArray(parsed.sectors)) {
        throw new Error("Arquivo inválido: campo 'sectors' ausente.");
      }
      const result = await importFn({ data: { sectors: parsed.sectors, audits: parsed.audits ?? [] } });
      toast.success(
        `Importado: ${result.sectorsCreated} setor(es), ${result.questionsCreated} pergunta(s), ${result.auditsCreated} auditoria(s), ${result.responsesCreated} resposta(s)`,
      );
      sectors.refetch();
      audits.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function exportCsv() {
    const all = audits.data ?? [];
    const full = await Promise.all(all.map((a) => fetchAudit({ data: { id: a.id } })));
    const lines = ["sector;date;auditor;status;conformity;c;nc;na;question_code;question;response;comment"];
    for (const { audit, responses } of full) {
      for (const r of responses) {
        const row = [
          audit.sector_name, audit.audit_date, audit.auditor_name ?? "", audit.status,
          audit.conformity_score ?? "", audit.c_count, audit.nc_count, audit.na_count,
          r.question_code_snapshot ?? "", r.question_text_snapshot, r.status ?? "", (r.comment ?? "").replace(/\n/g, " "),
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
        lines.push(row);
      }
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `auditorias-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV baixado");
  }

  const loading = audits.isLoading || sectors.isLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestão de dados</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Exporte, faça backup ou importe seus dados.</p>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Resumo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "Carregando..." : `${audits.data?.length ?? 0} auditorias · ${sectors.data?.length ?? 0} setores`}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Button onClick={exportCsv} disabled={loading} className="justify-start h-12" variant="outline">
            <Download className="h-4 w-4 mr-2" /> Exportar todas como CSV
          </Button>
          <Button onClick={exportBackup} disabled={loading || exporting} className="justify-start h-12" variant="outline">
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileJson className="h-4 w-4 mr-2" />}
            Backup (baixar JSON)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="justify-start h-12"
          >
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Restore (ler arquivo JSON)
          </Button>
        </div>

        {loading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
      </div>

      <div className="rounded-2xl border bg-secondary/40 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <b className="text-foreground">Como funciona:</b> setores e perguntas ficam compartilhados entre todos os usuários — qualquer alteração é visível para toda a equipe. Auditorias realizadas continuam privadas de cada auditor.
          O <b>Backup (JSON)</b> exporta 100% dos dados: setores, perguntas e todas as auditorias com suas respostas e observações. No <b>Restore</b>, itens já existentes (mesmo nome / mesma auditoria) são preservados e apenas os novos são criados — nada é sobrescrito.
        </p>
      </div>
    </div>
  );
}
