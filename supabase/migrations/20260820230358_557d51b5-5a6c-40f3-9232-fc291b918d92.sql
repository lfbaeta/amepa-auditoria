-- Fix Security Linter Issues

-- 1. Create Policies for existing tables to fix "RLS Enabled No Policy"
DO $$
BEGIN
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles
            FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles
            FOR UPDATE TO authenticated USING (auth.uid() = user_id);
    END IF;

    -- organizations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Users can view their own organization') THEN
        CREATE POLICY "Users can view their own organization" ON public.organizations
            FOR SELECT TO authenticated USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND organization_id = public.organizations.id)
            );
    END IF;

    -- question_sections
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'question_sections' AND policyname = 'Admins can manage sections') THEN
        CREATE POLICY "Admins can manage sections" ON public.question_sections
            FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'question_sections' AND policyname = 'Auditors can view sections') THEN
        CREATE POLICY "Auditors can view sections" ON public.question_sections
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 2. Revoke public/authenticated EXECUTE from SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Ensure search_path is set (already did in migration but double checking)
ALTER FUNCTION public.has_role(UUID, public.app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
