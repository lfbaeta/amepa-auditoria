
-- Corrigir a função get_my_org para segurança
CREATE OR REPLACE FUNCTION public.get_my_org() RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Revogar execução pública da get_my_org (apenas autenticados podem rodar via RLS)
REVOKE EXECUTE ON FUNCTION public.get_my_org() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_org() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_org() TO service_role;

-- Vincular registros órfãos à organização padrão para evitar que sumam no app
UPDATE public.specialties SET organization_id = '06a76976-440c-4a0d-807f-7457bab7aaa1' WHERE organization_id IS NULL;
UPDATE public.sectors SET organization_id = '06a76976-440c-4a0d-807f-7457bab7aaa1' WHERE organization_id IS NULL;
UPDATE public.questions SET organization_id = '06a76976-440c-4a0d-807f-7457bab7aaa1' WHERE organization_id IS NULL;
UPDATE public.audits SET organization_id = '06a76976-440c-4a0d-807f-7457bab7aaa1' WHERE organization_id IS NULL;
UPDATE public.responses SET organization_id = '06a76976-440c-4a0d-807f-7457bab7aaa1' WHERE organization_id IS NULL;
