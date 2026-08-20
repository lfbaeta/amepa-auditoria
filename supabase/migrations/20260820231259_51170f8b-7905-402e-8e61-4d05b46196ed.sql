
-- Cria a organização e o perfil manualmente para o usuário existente
DO $$ 
DECLARE
    u_id UUID := '1f940830-17c9-41fb-b9d9-72ea85662f2a';
    o_id UUID;
BEGIN
    -- 1. Tentar encontrar ou criar organização
    SELECT id INTO o_id FROM public.organizations LIMIT 1;
    IF o_id IS NULL THEN
        INSERT INTO public.organizations (name) VALUES ('Minha Organização') RETURNING id INTO o_id;
    END IF;

    -- 2. Tentar encontrar ou criar perfil
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = u_id) THEN
        INSERT INTO public.profiles (user_id, organization_id, full_name, role)
        VALUES (u_id, o_id, 'lfbaeta@gmail.com', 'admin');
    END IF;
END $$;
