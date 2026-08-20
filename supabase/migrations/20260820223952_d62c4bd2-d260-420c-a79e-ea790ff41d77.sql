REVOKE EXECUTE ON FUNCTION public.seed_default_specialties(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_specialties(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_specialties(uuid) TO service_role;
