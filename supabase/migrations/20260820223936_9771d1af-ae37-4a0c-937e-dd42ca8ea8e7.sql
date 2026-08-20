
-- 1. Criar a tabela de especialidades
CREATE TABLE public.specialties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    icon text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Adicionar specialty_id em sectors
ALTER TABLE public.sectors ADD COLUMN specialty_id uuid REFERENCES public.specialties(id) ON DELETE SET NULL;

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;

-- 4. RLS
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own specialties" 
ON public.specialties 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Migração de dados existentes e Função de Seed
CREATE OR REPLACE FUNCTION public.seed_default_specialties(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_spec_id uuid;
BEGIN
    -- Cria especialidade padrão se não existir para este usuário
    INSERT INTO public.specialties (user_id, name, description, icon, sort_order)
    VALUES (p_user, 'Saúde / SCIRAS', 'Auditorias voltadas ao controle de infecção e assistência médica.', 'stethoscope', 0)
    RETURNING id INTO v_spec_id;

    -- Vincula setores órfãos do usuário a esta nova especialidade
    UPDATE public.sectors 
    SET specialty_id = v_spec_id 
    WHERE user_id = p_user AND specialty_id IS NULL;
END;
$$;

-- 6. Executar para usuários existentes que já tenham setores mas não especialidades
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT DISTINCT user_id FROM public.sectors WHERE specialty_id IS NULL LOOP
        PERFORM public.seed_default_specialties(u.user_id);
    END LOOP;
END $$;
