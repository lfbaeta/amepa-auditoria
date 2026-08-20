import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats, listAudits, listSpecialties } from "@/lib/audit.functions";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AlertTriangle, BarChart3, ClipboardCheck, Download, FileText, Pencil, Plus, RotateCcw, Save, TrendingUp, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { buildCriticalAnalysis, generateCriticalReportPdf } from "@/lib/pdf";
import { toast } from "sonner";

const STORAGE_KEY = "sciras.analise-critica";

export const Route = createFileRoute("/_authenticated/painel")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Painel — Auditorias SCIRAS" }] }),
});

function Dashboard() {
  const [days, setDays] = useState(30);
  const getStats = useServerFn(getDashboardStats);
  const getAudits = useServerFn(listAudits);

  const stats = useQuery({
    queryKey: ["dashboard", days],
    queryFn: () => getStats({ data: { days } }),
  });
  const audits = useQuery({ queryKey: ["audits"], queryFn: () => getAudits() });

  const rows = stats.data?.rows ?? [];
  const overall = stats.data?.overallScore;
  const totals = stats.data?.totals ?? { audits: 0, c: 0, nc: 0, na: 0, criticalNc: 0 };
  const criticalNc = (totals as { criticalNc?: number }).criticalNc ?? 0;
  const lastAudits = (audits.data ?? []).slice(0, 5);

  const since = useMemo(() => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10), [days]);
  const periodAudits = useMemo(
    () => (audits.data ?? []).filter((a) => a.audit_date >= since),
    [audits.data, since],
  );
  const auto = useMemo(
    () => buildCriticalAnalysis(rows, { ...totals, criticalNc }, overall ?? null, days),
    [rows, totals, criticalNc, overall, days],
  );

  const [custom, setCustom] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}.${days}`);
      setCustom(saved);
    } catch {
      setCustom(null);
    }
  }, [days]);

  const analysis = useMemo(
    () => (custom != null ? custom.split("\n").map((l) => l.trim()).filter(Boolean) : auto),
    [custom, auto],
  );

  const startEdit = () => {
    setDraft(analysis.join("\n\n"));
    setEditing(true);
  };
  const saveEdit = () => {
    const value = draft.trim();
    try {
      if (value) localStorage.setItem(`${STORAGE_KEY}.${days}`, value);
      else localStorage.removeItem(`${STORAGE_KEY}.${days}`);
    } catch { /* ignore */ }
    setCustom(value || null);
    setEditing(false);
    toast.success("Análise crítica salva.");
  };
  const resetEdit = () => {
    try { localStorage.removeItem(`${STORAGE_KEY}.${days}`); } catch { /* ignore */ }
    setCustom(null);
    setDraft(auto.join("\n\n"));
    toast.success("Texto restaurado para o gerado automaticamente.");
  };

  const handleDownload = () => {
    try {
      generateCriticalReportPdf({
        days,
        rows,
        totals: { ...totals, criticalNc },
        overallScore: overall ?? null,
        audits: periodAudits,
        analysis,
      });
      toast.success("Relatório de análise crítica gerado.");
    } catch {
      toast.error("Não foi possível gerar o relatório.");
    }
  };


  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel crítico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Setores ordenados por criticidade e não conformidades.</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/setores"><Plus className="h-4 w-4 mr-1" /> Nova</Link>
        </Button>
      </div>

      <div className="flex gap-1.5">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              days === d ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>

      {criticalNc > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">Alerta: {criticalNc} NC em setores críticos</p>
            <p className="text-xs text-muted-foreground mt-0.5">Priorize ações corretivas nos setores marcados como críticos.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Relatório de análise crítica</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Últimos {days} dias · {periodAudits.length} auditoria(s){custom ? " · texto editado" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {!editing && (
              <Button size="sm" variant="ghost" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={stats.isLoading}>
              <Download className="h-4 w-4 mr-1" /> Baixar
            </Button>
          </div>
        </div>
        {editing ? (
          <div className="mt-3 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              className="text-sm leading-relaxed"
              placeholder="Uma linha em branco separa cada parágrafo da análise."
            />
            <p className="text-xs text-muted-foreground">Cada linha vira um item da análise, no app e no PDF.</p>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
              <Button size="sm" variant="outline" onClick={resetEdit}><RotateCcw className="h-4 w-4 mr-1" /> Restaurar automático</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
            </div>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {analysis.map((p, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>



      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ClipboardCheck} label="Auditorias" value={String(totals.audits)} tint="primary" />
        <StatCard icon={TrendingUp} label="Conformidade" value={overall != null ? `${overall.toFixed(1)}%` : "—"} tint="success" />
        <StatCard icon={AlertTriangle} label="Não Conformes" value={String(totals.nc)} tint="destructive" />
        <StatCard icon={BarChart3} label="Conformes" value={String(totals.c)} tint="muted" />
      </div>


      <div className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Não conformidades por setor</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma auditoria finalizada no período.</p>
        ) : (
          <div className="h-[260px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis dataKey="name" type="category" width={120} stroke="var(--color-muted-foreground)" fontSize={11}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
                <Bar dataKey="nc" name="Não Conforme" fill="var(--color-destructive)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Últimas auditorias</h2>
          <Link to="/historico" className="text-xs text-primary font-medium">Ver tudo →</Link>
        </div>
        {lastAudits.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nada por aqui ainda.</p>
        ) : (
          <ul className="divide-y">
            {lastAudits.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.sector_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(a.audit_date + "T00:00:00").toLocaleDateString("pt-BR")} ·{" "}
                    {a.status === "finalizada" ? `${Number(a.conformity_score ?? 0).toFixed(0)}% conformidade` : "Em andamento"}
                  </p>
                </div>
                <Link
                  to={a.status === "finalizada" ? "/auditoria/$id/resumo" : "/auditoria/$id"}
                  params={{ id: a.id }}
                  className="text-xs font-medium text-primary"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tint: "primary" | "success" | "destructive" | "muted" }) {
  const tintMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tintMap[tint]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-semibold mt-3">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
