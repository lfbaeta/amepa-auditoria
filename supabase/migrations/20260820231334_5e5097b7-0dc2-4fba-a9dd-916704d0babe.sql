
-- Revogar permissões de funções SECURITY DEFINER legadas ou utilitárias
REVOKE EXECUTE ON FUNCTION public.seed_default_specialties(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_specialties(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_specialties(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION public.seed_default_sectors(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_sectors(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_sectors(UUID) FROM anon;
