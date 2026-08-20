import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AuditRow = {
  sector_name: string;
  auditor_name: string | null;
  sector_responsible: string | null;
  audit_date: string;
  conformity_score: number | null;
  c_count: number;
  nc_count: number;
  na_count: number;
  notes: string | null;
  finished_at: string | null;
};

type ResponseRow = {
  question_code_snapshot: string | null;
  question_text_snapshot: string;
  status: "C" | "NC" | "NA" | null;
  comment: string | null;
};

const statusLabel: Record<string, string> = { C: "Conforme", NC: "Não Conforme", NA: "N/A" };

export function generateAuditPdf(audit: AuditRow, responses: ResponseRow[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;

  // Header band
  doc.setFillColor(43, 127, 224); // #2B7FE0
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Auditoria SCIRAS", margin, 32);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(audit.sector_name, margin, 52);
  y = 100;

  // Meta block
  doc.setTextColor(20, 24, 35);
  doc.setFontSize(10);
  const date = new Date(audit.audit_date + "T00:00:00").toLocaleDateString("pt-BR");
  const finished = audit.finished_at ? new Date(audit.finished_at).toLocaleString("pt-BR") : "—";
  const score = audit.conformity_score != null ? `${Number(audit.conformity_score).toFixed(1)}%` : "—";
  const meta: [string, string][] = [
    ["Data da visita", date],
    ["Avaliador", audit.auditor_name || "—"],
    ["Responsável pelo setor", audit.sector_responsible || "—"],
    ["Finalizada em", finished],
    ["Conformidade", score],
    ["Conforme / Não Conforme / N/A", `${audit.c_count} / ${audit.nc_count} / ${audit.na_count}`],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}: `, margin, y);
    const w = doc.getTextWidth(`${k}: `);
    doc.setFont("helvetica", "normal");
    doc.text(v, margin + w, y);
    y += 16;
  });

  y += 8;
  autoTable(doc, {
    startY: y,
    head: [["#", "Item avaliado", "Status", "Observações"]],
    body: responses.map((r, i) => [
      r.question_code_snapshot || String(i + 1),
      r.question_text_snapshot,
      r.status ? statusLabel[r.status] : "—",
      r.comment || "",
    ]),
    headStyles: { fillColor: [43, 127, 224], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6, valign: "top" },
    columnStyles: {
      0: { cellWidth: 40, halign: "center" },
      1: { cellWidth: 240 },
      2: { cellWidth: 70, halign: "center" },
      3: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const v = String(data.cell.raw);
        if (v === "Não Conforme") data.cell.styles.textColor = [200, 30, 30];
        else if (v === "Conforme") data.cell.styles.textColor = [30, 130, 80];
        else if (v === "N/A") data.cell.styles.textColor = [110, 110, 110];
      }
    },
    margin: { left: margin, right: margin },
  });

  if (audit.notes) {
    // @ts-expect-error lastAutoTable injected by plugin
    const endY = doc.lastAutoTable?.finalY ?? y;
    let ny = endY + 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Não conformidades críticas / observações", margin, ny);
    ny += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(audit.notes, doc.internal.pageSize.getWidth() - margin * 2);
    doc.text(lines, margin, ny);
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`SCIRAS · Página ${i} de ${pages}`, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  const safeName = audit.sector_name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`auditoria-${safeName}-${audit.audit_date}.pdf`);
}

type CriticalRow = {
  name: string;
  isCritical: boolean;
  nc: number;
  c: number;
  na: number;
  audits: number;
  avgScore: number | null;
};

type CriticalAudit = {
  sector_name: string;
  audit_date: string;
  auditor_name: string | null;
  status: string;
  conformity_score: number | null;
  c_count: number;
  nc_count: number;
  na_count: number;
  is_critical: boolean;
};

export function buildCriticalAnalysis(
  rows: CriticalRow[],
  totals: { audits: number; c: number; nc: number; na: number; criticalNc: number },
  overallScore: number | null,
  days: number,
): string[] {
  const out: string[] = [];
  out.push(
    `No período de ${days} dias foram consideradas ${totals.audits} auditoria(s) finalizada(s), com ${totals.c} item(ns) conforme(s), ${totals.nc} não conforme(s) e ${totals.na} não aplicável(is).`,
  );
  out.push(
    overallScore != null
      ? `O índice global de conformidade é de ${overallScore.toFixed(1)}%, ${overallScore >= 90 ? "considerado adequado" : overallScore >= 75 ? "considerado limítrofe, exigindo monitoramento" : "considerado insatisfatório, exigindo plano de ação imediato"}.`
      : "Não há dados suficientes para calcular o índice global de conformidade no período.",
  );
  if (totals.criticalNc > 0) {
    out.push(
      `Atenção: foram identificadas ${totals.criticalNc} não conformidade(s) em setores classificados como críticos, o que representa risco assistencial elevado e demanda ação corretiva prioritária.`,
    );
  } else if (totals.audits > 0) {
    out.push("Nenhuma não conformidade foi registrada em setores classificados como críticos no período.");
  }
  const worst = [...rows].filter((r) => r.nc > 0).sort((a, b) => b.nc - a.nc).slice(0, 3);
  if (worst.length) {
    out.push(
      `Setores com maior número de não conformidades: ${worst.map((w) => `${w.name} (${w.nc}${w.isCritical ? ", crítico" : ""})`).join("; ")}.`,
    );
  }
  const best = rows.filter((r) => r.avgScore != null && r.avgScore >= 95).map((r) => r.name);
  if (best.length) out.push(`Setores com desempenho destacado (≥95% de conformidade): ${best.join("; ")}.`);
  out.push(
    "Recomenda-se registrar plano de ação com responsável e prazo para cada não conformidade, reavaliar os setores críticos na próxima visita técnica e manter a educação permanente das equipes.",
  );
  return out;
}

export function generateCriticalReportPdf(params: {
  days: number;
  rows: CriticalRow[];
  totals: { audits: number; c: number; nc: number; na: number; criticalNc: number };
  overallScore: number | null;
  audits: CriticalAudit[];
  analysis?: string[];
}) {
  const { days, rows, totals, overallScore, audits } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(43, 127, 224);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Análise Crítica", margin, 32);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Últimos ${days} dias · emitido em ${new Date().toLocaleString("pt-BR")}`, margin, 52);

  let y = 100;
  doc.setTextColor(20, 24, 35);
  doc.setFontSize(10);
  const meta: [string, string][] = [
    ["Auditorias finalizadas", String(totals.audits)],
    ["Conformidade global", overallScore != null ? `${overallScore.toFixed(1)}%` : "—"],
    ["Conforme / Não Conforme / N/A", `${totals.c} / ${totals.nc} / ${totals.na}`],
    ["NC em setores críticos", String(totals.criticalNc)],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}: `, margin, y);
    const w = doc.getTextWidth(`${k}: `);
    doc.setFont("helvetica", "normal");
    doc.text(v, margin + w, y);
    y += 16;
  });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Análise crítica", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const paragraphs = params.analysis?.length
    ? params.analysis
    : buildCriticalAnalysis(rows, totals, overallScore, days);
  const bullet = "•";
  const bulletWidth = doc.getTextWidth(`${bullet} `);
  const textIndent = margin + bulletWidth;
  const maxTextWidth = pageW - margin * 2 - bulletWidth;
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, maxTextWidth);
    if (y + lines.length * 13 > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.text(bullet, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(lines, textIndent, y);
    y += lines.length * 13 + 8;
  }

  autoTable(doc, {
    startY: y + 8,
    head: [["Setor", "Crítico", "Auditorias", "C", "NC", "N/A", "Conformidade"]],
    body: rows.map((r) => [
      r.name,
      r.isCritical ? "Sim" : "Não",
      String(r.audits),
      String(r.c),
      String(r.nc),
      String(r.na),
      r.avgScore != null ? `${r.avgScore.toFixed(1)}%` : "—",
    ]),
    headStyles: { fillColor: [43, 127, 224], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 5, valign: "top" },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4 && Number(data.cell.raw) > 0) {
        data.cell.styles.textColor = [200, 30, 30];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // @ts-expect-error lastAutoTable injected by plugin
  let ny = (doc.lastAutoTable?.finalY ?? y) + 24;
  if (audits.length) {
    if (ny > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      ny = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Auditorias do período", margin, ny);
    autoTable(doc, {
      startY: ny + 10,
      head: [["Data", "Setor", "Avaliador", "Situação", "C", "NC", "N/A", "Conformidade"]],
      body: audits.map((a) => [
        new Date(a.audit_date + "T00:00:00").toLocaleDateString("pt-BR"),
        `${a.sector_name}${a.is_critical ? " (crítico)" : ""}`,
        a.auditor_name || "—",
        a.status === "finalizada" ? "Finalizada" : "Em andamento",
        String(a.c_count),
        String(a.nc_count),
        String(a.na_count),
        a.conformity_score != null ? `${Number(a.conformity_score).toFixed(1)}%` : "—",
      ]),
      headStyles: { fillColor: [43, 127, 224], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 4, valign: "top" },
      margin: { left: margin, right: margin },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`SCIRAS · Análise crítica · Página ${i} de ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  doc.save(`analise-critica-${days}d-${new Date().toISOString().slice(0, 10)}.pdf`);
}
