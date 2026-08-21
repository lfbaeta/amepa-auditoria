
-- Adicionar organization_id às tabelas que faltam para suporte multi-tenancy
ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Atualizar GRANTs
GRANT ALL ON public.specialties TO authenticated;
GRANT ALL ON public.sectors TO authenticated;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.audits TO authenticated;
GRANT ALL ON public.responses TO authenticated;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_specialties_org ON public.specialties(organization_id);
CREATE INDEX IF NOT EXISTS idx_sectors_org ON public.sectors(organization_id);
CREATE INDEX IF NOT EXISTS idx_questions_org ON public.questions(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_org ON public.audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_responses_org ON public.responses(organization_id);

-- Habilitar RLS em tudo (caso não esteja)
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS baseadas em organization_id
-- Nota: Usamos profiles para descobrir a org do usuário atual
CREATE OR REPLACE FUNCTION get_my_org() RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Remover políticas antigas se existirem (para evitar erros de duplicata)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Org isolation" ON public.specialties;
    DROP POLICY IF EXISTS "Org isolation" ON public.sectors;
    DROP POLICY IF EXISTS "Org isolation" ON public.questions;
    DROP POLICY IF EXISTS "Org isolation" ON public.audits;
    DROP POLICY IF EXISTS "Org isolation" ON public.responses;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Org isolation" ON public.specialties FOR ALL TO authenticated USING (organization_id = get_my_org());
CREATE POLICY "Org isolation" ON public.sectors FOR ALL TO authenticated USING (organization_id = get_my_org());
CREATE POLICY "Org isolation" ON public.questions FOR ALL TO authenticated USING (organization_id = get_my_org());
CREATE POLICY "Org isolation" ON public.audits FOR ALL TO authenticated USING (organization_id = get_my_org());
CREATE POLICY "Org isolation" ON public.responses FOR ALL TO authenticated USING (organization_id = get_my_org());
