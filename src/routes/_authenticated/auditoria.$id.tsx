import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuditWithResponses, saveResponse, finishAudit } from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, X, MinusCircle, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/auditoria/$id")({
  component: AuditForm,
  head: () => ({ meta: [{ title: "Auditoria — SCIRAS" }] }),
});

type Status = "C" | "NC" | "NA";

function AuditForm() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getAuditWithResponses);
  const saveFn = useServerFn(saveResponse);
  const finishFn = useServerFn(finishAudit);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => fetchFn({ data: { id } }),
  });

  const [notes, setNotes] = useState("");
  useEffect(() => { if (data?.audit.notes) setNotes(data.audit.notes); }, [data?.audit.notes]);

  const finish = useMutation({
    mutationFn: () => finishFn({ data: { id, notes: notes || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audits"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/auditoria/$id/resumo", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const progress = useMemo(() => {
    const responses = data?.responses ?? [];
    const answered = responses.filter((r) => r.status).length;
    const ncMissing = responses.filter((r) => r.status === "NC" && !(r.comment ?? "").trim()).length;
    return { answered, total: responses.length, pct: responses.length ? Math.round((answered / responses.length) * 100) : 0, ncMissing };
  }, [data]);


  if (isLoading || !data) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const finalizada = data.audit.status === "finalizada";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild><Link to="/setores"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{data.audit.sector_name}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(data.audit.audit_date + "T00:00:00").toLocaleDateString("pt-BR")}
            {data.audit.auditor_name ? ` · ${data.audit.auditor_name}` : ""}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          <span className="text-muted-foreground">Progresso</span>
          <span>{progress.answered} de {progress.total}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
        </div>
      </div>

      {progress.ncMissing > 0 && !finalizada && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-destructive">
              {progress.ncMissing} não conformidade{progress.ncMissing > 1 ? "s" : ""} sem justificativa
            </p>
            <p className="text-muted-foreground mt-0.5">Descreva a evidência/ação em cada item marcado como NC para finalizar.</p>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {data.responses.map((r) => (
          <QuestionItem
            key={r.id}
            id={r.id}
            code={r.question_code_snapshot}
            text={r.question_text_snapshot}
            initialStatus={r.status as Status | null}
            initialComment={r.comment}
            disabled={finalizada}
            onSave={(payload) => saveFn({ data: { id: r.id, ...payload } })}
            onSaved={() => qc.invalidateQueries({ queryKey: ["audit", id] })}
          />
        ))}
      </ul>

      {!finalizada && (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <label className="text-sm font-medium">Não conformidades críticas / observações gerais</label>
            <Textarea className="mt-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resumo das principais NCs identificadas..." />
          </div>
          <Button
            className="w-full h-11"
            onClick={() => finish.mutate()}
            disabled={finish.isPending || progress.ncMissing > 0 || progress.answered < progress.total}
          >
            {finish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Finalizar auditoria</>}
          </Button>
          {progress.answered < progress.total && (
            <p className="text-[11px] text-muted-foreground text-center">Responda todos os itens para finalizar.</p>
          )}
        </div>
      )}

      {finalizada && (
        <Button asChild className="w-full h-11">
          <Link to="/auditoria/$id/resumo" params={{ id }}>Ver resumo e PDF</Link>
        </Button>
      )}

    </div>
  );
}

function QuestionItem({
  id, code, text, initialStatus, initialComment, disabled, onSave, onSaved,
}: {
  id: string; code: string | null; text: string;
  initialStatus: Status | null; initialComment: string | null;
  disabled: boolean;
  onSave: (p: { status: Status | null; comment: string | null }) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<Status | null>(initialStatus);
  const [comment, setComment] = useState(initialComment ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushSave(next: { status: Status | null; comment: string | null }, immediate = false) {
    if (disabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const run = () => onSave(next).then(onSaved).catch(() => toast.error("Falha ao salvar"));
    if (immediate) run();
    else debounceRef.current = setTimeout(run, 500);
  }

  void id;

  const needsJustification = status === "NC" && !comment.trim();

  return (
    <li className={`rounded-2xl border bg-card p-4 space-y-3 transition-colors ${status === "NC" ? "border-destructive/40 bg-destructive/[0.02]" : ""}`}>
      <div className="flex gap-3">
        {code && <span className="text-xs font-mono text-muted-foreground pt-0.5 shrink-0">{code}</span>}
        <p className="text-sm flex-1 leading-relaxed">{text}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatusButton active={status === "C"} onClick={() => { setStatus("C"); pushSave({ status: "C", comment: comment || null }, true); }} disabled={disabled} variant="success" icon={Check} label="Conforme" />
        <StatusButton active={status === "NC"} onClick={() => { setStatus("NC"); pushSave({ status: "NC", comment: comment || null }, true); }} disabled={disabled} variant="destructive" icon={X} label="Não Conforme" />
        <StatusButton active={status === "NA"} onClick={() => { setStatus("NA"); pushSave({ status: "NA", comment: comment || null }, true); }} disabled={disabled} variant="muted" icon={MinusCircle} label="N/A" />
      </div>
      {status === "NC" && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
          <AlertTriangle className="h-3 w-3" /> Justificativa obrigatória para NC
        </div>
      )}
      <Textarea
        rows={2}
        placeholder={status === "NC" ? "Descreva a evidência e ação corretiva..." : "Observações / evidências / ações..."}
        value={comment}
        disabled={disabled}
        onChange={(e) => { setComment(e.target.value); pushSave({ status, comment: e.target.value || null }); }}
        onBlur={() => pushSave({ status, comment: comment || null }, true)}
        className={needsJustification ? "border-destructive focus-visible:ring-destructive/30" : ""}
      />
    </li>
  );
}


function StatusButton({
  active, onClick, disabled, variant, icon: Icon, label,
}: {
  active: boolean; onClick: () => void; disabled: boolean;
  variant: "success" | "destructive" | "muted";
  icon: React.ComponentType<{ className?: string }>; label: string;
}) {
  const colorActive = {
    success: "bg-success text-success-foreground border-success",
    destructive: "bg-destructive text-destructive-foreground border-destructive",
    muted: "bg-muted-foreground/80 text-background border-muted-foreground/80",
  }[variant];
  const colorIdle = {
    success: "border-border text-success hover:bg-success/10",
    destructive: "border-border text-destructive hover:bg-destructive/10",
    muted: "border-border text-muted-foreground hover:bg-muted",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-12 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all disabled:opacity-50 ${active ? colorActive : `bg-card ${colorIdle}`}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
