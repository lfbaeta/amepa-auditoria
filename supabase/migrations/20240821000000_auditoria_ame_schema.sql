-- Create custom types
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'auditor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.audit_status_new AS ENUM ('em_andamento', 'finalizada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Organizations
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

CREATE POLICY "Users can view their own organization" ON public.organizations
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND organization_id = public.organizations.id)
    );

-- 2. Profiles
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

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Update Specialties Table
-- We add columns to existing table if it exists, otherwise create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'specialties') THEN
        CREATE TABLE public.specialties (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            code TEXT,
            description TEXT,
            icon TEXT,
            color TEXT,
            sort_order INTEGER DEFAULT 999,
            is_critical BOOLEAN DEFAULT false,
            active BOOLEAN DEFAULT true,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            user_id UUID REFERENCES auth.users(id) -- Keep for backward compatibility if needed
        );
    ELSE
        ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS code TEXT;
        ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS color TEXT;
        ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;
        ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
        ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
        ALTER TABLE public.specialties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- 4. Question Sections
CREATE TABLE IF NOT EXISTS public.question_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    specialty_id UUID REFERENCES public.specialties(id) ON DELETE CASCADE NOT NULL,
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

-- 5. Update Questions Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questions') THEN
        CREATE TABLE public.questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
            specialty_id UUID REFERENCES public.specialties(id) ON DELETE CASCADE,
            section_id UUID REFERENCES public.question_sections(id) ON DELETE SET NULL,
            code TEXT,
            text TEXT NOT NULL,
            guidance TEXT,
            sort_order INTEGER DEFAULT 0 NOT NULL,
            allow_c BOOLEAN DEFAULT true NOT NULL,
            allow_nc BOOLEAN DEFAULT true NOT NULL,
            allow_na BOOLEAN DEFAULT true NOT NULL,
            require_nc_comment BOOLEAN DEFAULT true NOT NULL,
            require_action_plan BOOLEAN DEFAULT false NOT NULL,
            allow_evidence BOOLEAN DEFAULT true NOT NULL,
            is_critical BOOLEAN DEFAULT false NOT NULL,
            active BOOLEAN DEFAULT true NOT NULL,
            version INTEGER DEFAULT 1 NOT NULL,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            sector_id UUID REFERENCES public.sectors(id), -- Backward compat
            user_id UUID REFERENCES auth.users(id) -- Backward compat
        );
    ELSE
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES public.specialties(id) ON DELETE CASCADE;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.question_sections(id) ON DELETE SET NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS guidance TEXT;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS allow_c BOOLEAN DEFAULT true NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS allow_nc BOOLEAN DEFAULT true NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS allow_na BOOLEAN DEFAULT true NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS require_nc_comment BOOLEAN DEFAULT true NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS require_action_plan BOOLEAN DEFAULT false NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS allow_evidence BOOLEAN DEFAULT true NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
        ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 6. Update Audits Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audits') THEN
        CREATE TABLE public.audits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) NOT NULL,
            specialty_id UUID REFERENCES public.specialties(id) ON DELETE CASCADE,
            auditor_name TEXT,
            audited_location TEXT, -- sector_name equivalent
            responsible_name TEXT, -- sector_responsible equivalent
            audit_date DATE DEFAULT CURRENT_DATE NOT NULL,
            start_time TIMESTAMPTZ DEFAULT now(),
            status public.audit_status_new DEFAULT 'em_andamento' NOT NULL,
            conformity_score NUMERIC,
            c_count INTEGER DEFAULT 0,
            nc_count INTEGER DEFAULT 0,
            na_count INTEGER DEFAULT 0,
            notes TEXT,
            finished_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            sector_id UUID REFERENCES public.sectors(id) -- Backward compat
        );
    ELSE
        ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES public.specialties(id) ON DELETE CASCADE;
        ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS audited_location TEXT;
        ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS responsible_name TEXT;
        ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- 7. RLS Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 8. Trigger to create profile and organization for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Create default organization for the first user or new users (MVP simplified)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_specialties_updated_at BEFORE UPDATE ON public.specialties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_question_sections_updated_at BEFORE UPDATE ON public.question_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

