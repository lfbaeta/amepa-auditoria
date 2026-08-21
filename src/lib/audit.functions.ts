import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

// ---------- Backup / Restore ----------
export const exportBackupData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: specialties, error: spe } = await context.supabase
      .from("specialties")
      .select("id, name, description, icon, sort_order")
      .order("sort_order", { ascending: true });
    if (spe) throw new Error(spe.message);
    const { data: sectors, error: se } = await context.supabase
      .from("sectors")
      .select("id, specialty_id, name, description, icon, is_default, is_critical, sort_order")
      .order("sort_order", { ascending: true });
    if (se) throw new Error(se.message);
    const { data: questions, error: qe } = await context.supabase
      .from("questions")
      .select("id, sector_id, code, text, sort_order, active")
      .order("sort_order", { ascending: true });
    if (qe) throw new Error(qe.message);
    return { specialties: specialties ?? [], sectors: sectors ?? [], questions: questions ?? [] };
  });

export const importBackupData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    sectors: Array<{ name: string; description?: string | null; icon?: string | null; is_critical?: boolean; sort_order?: number; questions?: Array<{ code?: string | null; text: string; sort_order?: number; active?: boolean }> }>;
    audits?: Array<{
      audit: {
        sector_name: string;
        is_critical?: boolean | null;
        auditor_name?: string | null;
        sector_responsible?: string | null;
        audit_date: string;
        status: "em_andamento" | "finalizada";
        conformity_score?: number | null;
        c_count?: number | null;
        nc_count?: number | null;
        na_count?: number | null;
        notes?: string | null;
        created_at?: string | null;
        finished_at?: string | null;
      };
      responses: Array<{
        question_text_snapshot: string;
        question_code_snapshot?: string | null;
        sort_order?: number | null;
        status?: "C" | "NC" | "NA" | null;
        comment?: string | null;
      }>;
    }>;
  }) =>
    z.object({
      sectors: z.array(z.object({
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        is_critical: z.boolean().optional(),
        sort_order: z.number().optional(),
        questions: z.array(z.object({
          code: z.string().nullable().optional(),
          text: z.string().min(1),
          sort_order: z.number().optional(),
          active: z.boolean().optional(),
        })).optional(),
      })),
      audits: z.array(z.object({
        audit: z.object({
          sector_name: z.string().min(1),
          is_critical: z.boolean().nullable().optional(),
          auditor_name: z.string().nullable().optional(),
          sector_responsible: z.string().nullable().optional(),
          audit_date: z.string(),
          status: z.enum(["em_andamento", "finalizada"]),
          conformity_score: z.number().nullable().optional(),
          c_count: z.number().nullable().optional(),
          nc_count: z.number().nullable().optional(),
          na_count: z.number().nullable().optional(),
          notes: z.string().nullable().optional(),
          created_at: z.string().nullable().optional(),
          finished_at: z.string().nullable().optional(),
        }),
        responses: z.array(z.object({
          question_text_snapshot: z.string().min(1),
          question_code_snapshot: z.string().nullable().optional(),
          sort_order: z.number().nullable().optional(),
          status: z.enum(["C", "NC", "NA"]).nullable().optional(),
          comment: z.string().nullable().optional(),
        })),
      })).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // 1. Garantir que o usuário tem pelo menos uma especialidade (para que os setores importados fiquem visíveis)
    const { data: specs } = await context.supabase.from("specialties").select("id").limit(1);
    let targetSpecId: string;
    
    if (!specs || specs.length === 0) {
      const { data: newSpec, error: speErr } = await context.supabase
        .from("specialties")
        .insert({
          user_id: context.userId,
          name: "Importado",
          description: "Especialidade criada automaticamente durante a importação.",
          icon: "briefcase",
        })
        .select()
        .single();
      if (speErr) throw new Error("Erro ao criar especialidade para importação: " + speErr.message);
      targetSpecId = newSpec.id;
    } else {
      targetSpecId = specs[0].id;
    }

    const { data: existing } = await context.supabase.from("sectors").select("id, name");
    const byName = new Map((existing ?? []).map((s) => [s.name.toLowerCase(), s.id]));
    let sectorsCreated = 0;
    let questionsCreated = 0;
    let auditsCreated = 0;
    let responsesCreated = 0;

    for (const s of data.sectors) {
      let sectorId = byName.get(s.name.toLowerCase());
      if (!sectorId) {
        const { data: row, error } = await context.supabase
          .from("sectors")
          .insert({
            name: s.name,
            description: s.description ?? null,
            icon: s.icon ?? null,
            is_critical: s.is_critical ?? false,
            sort_order: s.sort_order ?? 999,
            user_id: context.userId,
            specialty_id: targetSpecId,
          })
          .select("id").single();
        if (error) throw new Error(error.message);
        sectorId = row.id;
        byName.set(s.name.toLowerCase(), sectorId);
        sectorsCreated++;
      }

      if (s.questions && s.questions.length > 0) {
        const { data: existingQs } = await context.supabase
          .from("questions").select("text").eq("sector_id", sectorId);
        const qSet = new Set((existingQs ?? []).map((q) => q.text.trim().toLowerCase()));
        const toInsert = s.questions
          .filter((q) => !qSet.has(q.text.trim().toLowerCase()))
          .map((q, i) => ({
            sector_id: sectorId!,
            user_id: context.userId,
            code: q.code ?? null,
            text: q.text,
            sort_order: q.sort_order ?? i + 1,
            active: q.active ?? true,
          }));
        if (toInsert.length > 0) {
          const { error } = await context.supabase.from("questions").insert(toInsert);
          if (error) throw new Error(error.message);
          questionsCreated += toInsert.length;
        }
      }
    }

    if (data.audits && data.audits.length > 0) {
      const { data: existingAudits } = await context.supabase
        .from("audits").select("created_at, sector_name, audit_date, auditor_name");
      const dedupe = new Set(
        (existingAudits ?? []).map((a) => `${a.created_at}|${a.sector_name}|${a.audit_date}|${a.auditor_name ?? ""}`),
      );

      // Cache question lookup by sector: text -> question id
      const questionCache = new Map<string, Map<string, string>>();
      async function resolveQuestionId(sectorId: string, text: string, code: string | null): Promise<string> {
        let map = questionCache.get(sectorId);
        if (!map) {
          const { data: qs } = await context.supabase
            .from("questions").select("id, text").eq("sector_id", sectorId);
          map = new Map((qs ?? []).map((q) => [q.text.trim().toLowerCase(), q.id]));
          questionCache.set(sectorId, map);
        }
        const key = text.trim().toLowerCase();
        const found = map.get(key);
        if (found) return found;
        // Create a new (inactive) question so historical response can be restored
        const { data: newQ, error } = await context.supabase
          .from("questions").insert({
            sector_id: sectorId,
            user_id: context.userId,
            code: code ?? null,
            text,
            sort_order: 999,
            active: false,
          }).select("id").single();
        if (error) throw new Error(error.message);
        map.set(key, newQ.id);
        questionsCreated++;
        return newQ.id;
      }

      for (const item of data.audits) {
        const a = item.audit;
        const key = `${a.created_at ?? ""}|${a.sector_name}|${a.audit_date}|${a.auditor_name ?? ""}`;
        if (a.created_at && dedupe.has(key)) continue;

        const sectorId = byName.get(a.sector_name.toLowerCase());
        if (!sectorId) continue;

        const insertPayload = {
          user_id: context.userId,
          sector_id: sectorId,
          sector_name: a.sector_name,
          is_critical: a.is_critical ?? false,
          auditor_name: a.auditor_name ?? null,
          sector_responsible: a.sector_responsible ?? null,
          audit_date: a.audit_date,
          status: a.status,
          conformity_score: a.conformity_score ?? null,
          c_count: a.c_count ?? 0,
          nc_count: a.nc_count ?? 0,
          na_count: a.na_count ?? 0,
          notes: a.notes ?? null,
          finished_at: a.finished_at ?? null,
          ...(a.created_at ? { created_at: a.created_at } : {}),
        };

        const { data: newAudit, error: ae } = await context.supabase
          .from("audits").insert(insertPayload).select("id").single();
        if (ae) throw new Error(ae.message);
        auditsCreated++;

        if (item.responses.length > 0) {
          const rows = [];
          for (let i = 0; i < item.responses.length; i++) {
            const r = item.responses[i];
            const qid = await resolveQuestionId(sectorId, r.question_text_snapshot, r.question_code_snapshot ?? null);
            rows.push({
              audit_id: newAudit.id,
              question_id: qid,
              user_id: context.userId,
              question_text_snapshot: r.question_text_snapshot,
              question_code_snapshot: r.question_code_snapshot ?? null,
              sort_order: r.sort_order ?? i + 1,
              status: r.status ?? null,
              comment: r.comment ?? null,
            });
          }
          const { error: re } = await context.supabase.from("responses").insert(rows);
          if (re) throw new Error(re.message);
          responsesCreated += rows.length;
        }
      }
    }

    return { sectorsCreated, questionsCreated, auditsCreated, responsesCreated };
  });

// ---------- Specialties ----------
export const listSpecialties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Obter o perfil para saber a organização
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("user_id", context.userId)
      .maybeSingle();

    let query = context.supabase
      .from("specialties")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    
    if (profile?.organization_id) {
      query = query.filter("organization_id", "eq", profile.organization_id);
      if (profile.role === "auditor") {
        query = query.filter("active", "eq", true);
      }
    } else {
      query = query.filter("user_id", "eq", context.userId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSpecialty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { 
    name: string; 
    description?: string | null; 
    icon?: string | null;
  }) =>
    z.object({
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional().nullable(),
      icon: z.string().max(50).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await (context.supabase as any)
      .from("profiles")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: row, error } = await (context.supabase as any)
      .from("specialties")
      .insert({
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        user_id: context.userId,
        organization_id: profile?.organization_id ?? null,
        sort_order: 999,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSpecialty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { 
    id: string; 
    name: string; 
    description?: string | null; 
    icon?: string | null;
  }) =>
    z.object({
      id: uuid,
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional().nullable(),
      icon: z.string().max(50).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("specialties")
      .update({
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSpecialty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    // Verificar se existem auditorias vinculadas (regra: excluir apenas sem histórico)
    const { count } = await (context.supabase as any)
      .from("audits")
      .select("id", { count: "exact", head: true })
      .eq("specialty_id", data.id);
    
    if (count && count > 0) {
      throw new Error("Não é possível excluir uma especialidade que já possui auditorias registradas. Desative-a em vez disso.");
    }

    const { error } = await (context.supabase as any).from("specialties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Sectors ----------
export const listSectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { specialtyId?: string }) => z.object({ specialtyId: uuid.optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("sectors")
      .select("id, name, description, icon, is_default, is_critical, sort_order, specialty_id");
    
    if (data.specialtyId) {
      query = query.eq("specialty_id", data.specialtyId);
    }

    const { data: rows, error } = await query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
      
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; description?: string | null; isCritical?: boolean; specialtyId: string }) =>
    z.object({
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional().nullable(),
      isCritical: z.boolean().optional(),
      specialtyId: uuid,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: row, error } = await context.supabase
      .from("sectors")
      .insert({
        name: data.name,
        description: data.description ?? null,
        user_id: context.userId,
        specialty_id: data.specialtyId,
        organization_id: profile?.organization_id ?? null,
        sort_order: 999,
        is_critical: data.isCritical ?? false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string; description?: string | null; isCritical?: boolean; specialtyId?: string }) =>
    z.object({
      id: uuid,
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional().nullable(),
      isCritical: z.boolean().optional(),
      specialtyId: uuid.optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: any = {
      name: data.name,
      description: data.description ?? null,
    };
    if (data.isCritical !== undefined) patch.is_critical = data.isCritical;
    if (data.specialtyId !== undefined) patch.specialty_id = data.specialtyId;
    
    const { error } = await context.supabase.from("sectors").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sectors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ---------- Questions ----------
export const listQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sectorId: string }) => z.object({ sectorId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("questions")
      .select("id, code, text, sort_order, active")
      .eq("sector_id", data.sectorId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sectorId: string; text: string; code?: string | null }) =>
    z.object({ sectorId: uuid, text: z.string().min(1).max(600), code: z.string().max(20).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: max } = await context.supabase
      .from("questions").select("sort_order").eq("sector_id", data.sectorId)
      .order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const nextOrder = (max?.sort_order ?? 0) + 1;
    const { data: row, error } = await context.supabase
      .from("questions")
      .insert({ sector_id: data.sectorId, user_id: context.userId, text: data.text, code: data.code ?? null, sort_order: nextOrder })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; text: string; code?: string | null; active?: boolean }) =>
    z.object({ id: uuid, text: z.string().min(1).max(600), code: z.string().max(20).optional().nullable(), active: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: { text: string; code: string | null; active?: boolean } = { text: data.text, code: data.code ?? null };
    if (data.active !== undefined) patch.active = data.active;
    const { error } = await context.supabase.from("questions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Audits ----------
export const startAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sectorId: string; auditorName?: string; sectorResponsible?: string }) =>
    z.object({
      sectorId: uuid,
      auditorName: z.string().max(120).optional(),
      sectorResponsible: z.string().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: sector, error: se } = await context.supabase
      .from("sectors").select("id, name, is_critical").eq("id", data.sectorId).single();
    if (se || !sector) throw new Error("Setor não encontrado");

    const { data: questions, error: qe } = await context.supabase
      .from("questions").select("id, code, text, sort_order")
      .eq("sector_id", data.sectorId).eq("active", true)
      .order("sort_order", { ascending: true });
    if (qe) throw new Error(qe.message);
    if (!questions || questions.length === 0) throw new Error("Este setor não tem perguntas ativas.");

    const { data: audit, error: ae } = await context.supabase
      .from("audits").insert({
        user_id: context.userId,
        sector_id: sector.id,
        sector_name: sector.name,
        is_critical: sector.is_critical ?? false,
        auditor_name: data.auditorName ?? null,
        sector_responsible: data.sectorResponsible ?? null,
      }).select().single();

    if (ae || !audit) throw new Error(ae?.message ?? "Falha ao criar auditoria");

    const rows = questions.map((q) => ({
      audit_id: audit.id,
      question_id: q.id,
      user_id: context.userId,
      question_text_snapshot: q.text,
      question_code_snapshot: q.code,
      sort_order: q.sort_order,
    }));
    const { error: re } = await context.supabase.from("responses").insert(rows);
    if (re) throw new Error(re.message);

    return audit;
  });

export const getAuditWithResponses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: audit, error } = await context.supabase
      .from("audits").select("*").eq("id", data.id).single();
    if (error || !audit) throw new Error("Auditoria não encontrada");

    const { data: responses, error: re } = await context.supabase
      .from("responses").select("*").eq("audit_id", data.id)
      .order("sort_order", { ascending: true });
    if (re) throw new Error(re.message);
    return { audit, responses: responses ?? [] };
  });

export const saveResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "C" | "NC" | "NA" | null; comment?: string | null }) =>
    z.object({
      id: uuid,
      status: z.enum(["C", "NC", "NA"]).nullable(),
      comment: z.string().max(2000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("responses")
      .update({ status: data.status, comment: data.comment ?? null, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finishAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; notes?: string | null }) =>
    z.object({ id: uuid, notes: z.string().max(2000).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: responses, error } = await context.supabase
      .from("responses").select("status, comment, question_text_snapshot").eq("audit_id", data.id);
    if (error) throw new Error(error.message);
    const missing = (responses ?? []).filter((r) => r.status === "NC" && !(r.comment ?? "").trim());
    if (missing.length > 0) {
      throw new Error(`Justificativa obrigatória em ${missing.length} não conformidade(s). Preencha o campo de observação antes de finalizar.`);
    }

    const c = (responses ?? []).filter((r) => r.status === "C").length;
    const nc = (responses ?? []).filter((r) => r.status === "NC").length;
    const na = (responses ?? []).filter((r) => r.status === "NA").length;
    const denom = c + nc;
    const score = denom === 0 ? 0 : Math.round((c / denom) * 10000) / 100;
    const { error: ue } = await context.supabase
      .from("audits").update({
        status: "finalizada",
        conformity_score: score,
        c_count: c, nc_count: nc, na_count: na,
        notes: data.notes ?? null,
        finished_at: new Date().toISOString(),
      }).eq("id", data.id);
    if (ue) throw new Error(ue.message);
    return { ok: true, score, c, nc, na };
  });

export const deleteAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("audits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAudits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await (context.supabase as any)
      .from("profiles")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    let query = context.supabase
      .from("audits")
      .select("id, sector_id, sector_name, is_critical, auditor_name, audit_date, status, conformity_score, c_count, nc_count, na_count, created_at, finished_at");
    
    if (profile?.organization_id) {
      query = query.filter("organization_id", "eq", profile.organization_id);
    } else {
      query = query.filter("user_id", "eq", context.userId);
    }

    const { data, error } = await query
      .order("audit_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number; specialtyId?: string }) => 
    z.object({ 
      days: z.number().int().min(1).max(365).optional(),
      specialtyId: uuid.optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    const { data: profile } = await (context.supabase as any)
      .from("profiles")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    let query = context.supabase
      .from("audits")
      .select("sector_id, sector_name, is_critical, conformity_score, c_count, nc_count, na_count, status, audit_date, sectors!inner(specialty_id)")
      .eq("status", "finalizada")
      .gte("audit_date", since);

    if (profile?.organization_id) {
      query = query.filter("organization_id", "eq", profile.organization_id);
    } else {
      query = query.filter("user_id", "eq", context.userId);
    }

    if (data.specialtyId) {
      query = query.filter("sectors.specialty_id", "eq", data.specialtyId);
    }

    const { data: audits, error } = await query;
    if (error) throw new Error(error.message);

    const bySector = new Map<string, { sectorId: string; name: string; isCritical: boolean; nc: number; c: number; na: number; scores: number[]; audits: number }>();
    for (const a of audits ?? []) {
      const k = a.sector_id;
      const cur = bySector.get(k) ?? { sectorId: k, name: a.sector_name, isCritical: !!(a as any).is_critical, nc: 0, c: 0, na: 0, scores: [], audits: 0 };
      cur.nc += (a as any).nc_count ?? 0;
      cur.c += (a as any).c_count ?? 0;
      cur.na += (a as any).na_count ?? 0;
      cur.audits += 1;
      if ((a as any).conformity_score != null) cur.scores.push(Number((a as any).conformity_score));
      bySector.set(k, cur);
    }
    const rows = Array.from(bySector.values()).map((s) => ({
      sectorId: s.sectorId,
      name: s.name,
      isCritical: s.isCritical,
      nc: s.nc, c: s.c, na: s.na, audits: s.audits,
      avgScore: s.scores.length ? Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 100) / 100 : null,
    })).sort((a, b) => (Number(b.isCritical) - Number(a.isCritical)) || (b.nc - a.nc));

    const totals = rows.reduce((acc, r) => ({
      audits: acc.audits + r.audits, c: acc.c + r.c, nc: acc.nc + r.nc, na: acc.na + r.na,
      criticalNc: acc.criticalNc + (r.isCritical ? r.nc : 0),
    }), { audits: 0, c: 0, nc: 0, na: 0, criticalNc: 0 });
    const denom = totals.c + totals.nc;
    const overallScore = denom === 0 ? null : Math.round((totals.c / denom) * 10000) / 100;

    return { days, rows, totals, overallScore };
  });

export const getOrganizationProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: pErr } = await context.supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    return profile;
  });

export const updateTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { theme: string }) => z.object({ theme: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ theme: data.theme })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

