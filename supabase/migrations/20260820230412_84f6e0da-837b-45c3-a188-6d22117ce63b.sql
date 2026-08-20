-- Secure remaining SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.seed_default_sectors(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_sectors(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_sectors(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.seed_default_specialties(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_specialties(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_specialties(UUID) TO service_role;

-- Ensure search_path is set for everything
ALTER FUNCTION public.seed_default_sectors(UUID) SET search_path = public;
ALTER FUNCTION public.seed_default_specialties(UUID) SET search_path = public;
ALTER FUNCTION public.has_role(UUID, public.app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Grant EXECUTE on has_role back to authenticated because RLS policies need to call it!
-- Wait, RLS policies call it with the privileges of the user. If we revoke it, RLS will fail.
-- The linter warns about it because it's a security risk if not careful, but for has_role it is required.
-- However, we can keep it restricted to authenticated if we want.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
