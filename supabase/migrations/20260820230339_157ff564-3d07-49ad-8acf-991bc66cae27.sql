DO $$
BEGIN
    -- This migration script handles table creation and RLS for the Auditoria AME system.
    -- It includes Organizations, Profiles, Specialties, Question Sections, and more.

    -- 1. Create Types if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'auditor');
    END IF;

    -- 2. Organizations
    CREATE TABLE IF NOT EXISTS public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        logo_url TEXT,
        document TEXT,
        address TEXT,
        phone TEXT,
        report_header TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
    GRANT ALL ON public.organizations TO service_role;
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

    -- 3. Profiles
    CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
        full_name TEXT,
        role public.app_role DEFAULT 'auditor' NOT NULL,
        theme TEXT DEFAULT 'arctic',
        active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        UNIQUE(user_id)
    );

    GRANT SELECT, UPDATE ON public.profiles TO authenticated;
    GRANT ALL ON public.profiles TO service_role;
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- 4. Question Sections
    CREATE TABLE IF NOT EXISTS public.question_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
        specialty_id UUID, -- Will link to specialties table
        name TEXT NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0 NOT NULL,
        active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_sections TO authenticated;
    GRANT ALL ON public.question_sections TO service_role;
    ALTER TABLE public.question_sections ENABLE ROW LEVEL SECURITY;

    -- 5. Helper Function for Role Check
    CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $f$
      SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
          AND role = _role
      )
    $f$;

    -- 6. Trigger for profile creation
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $t$
    DECLARE
        org_id UUID;
    BEGIN
        INSERT INTO public.organizations (name)
        VALUES ('Minha Organização')
        RETURNING id INTO org_id;

        INSERT INTO public.profiles (user_id, organization_id, full_name, role)
        VALUES (
            NEW.id,
            org_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin'::public.app_role ELSE 'auditor'::public.app_role END
        );
        RETURN NEW;
    END;
    $t$ LANGUAGE plpgsql SECURITY DEFINER;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;

END $$;
