-- ========================================
-- SUPPRESSION TOTALE DE TOUTE SÉCURITÉ SUR LA TABLE NEWS
-- ACCÈS LIBRE POUR TOUS (ANON + AUTHENTICATED)
-- ========================================

-- 1. SUPPRIMER TOUTES LES POLICIES RLS EXISTANTES
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'news' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON public.news';
        RAISE NOTICE 'Policy supprimée: %', policy_rec.policyname;
    END LOOP;
END $$;

-- 2. DÉSACTIVER COMPLÈTEMENT RLS SUR LA TABLE NEWS
ALTER TABLE public.news DISABLE ROW LEVEL SECURITY;

-- 3. ACCORDER TOUS LES DROITS À TOUS LES RÔLES
GRANT ALL PRIVILEGES ON public.news TO anon;
GRANT ALL PRIVILEGES ON public.news TO authenticated;
GRANT ALL PRIVILEGES ON public.news TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. VÉRIFIER L'ÉTAT DE LA TABLE NEWS
SELECT 
    'ÉTAT DE LA TABLE NEWS' as info,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class 
WHERE relname = 'news' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 5. LISTER TOUTES LES POLICIES RESTANTES (DEVRAIT ÊTRE VIDE)
SELECT 
    'POLICIES RESTANTES' as info,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'news' AND schemaname = 'public';

-- 6. VÉRIFIER LES PERMISSIONS
SELECT 
    'PERMISSIONS' as info,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'news' AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 7. TEST DE LECTURE DIRECTE (SANS RESTRICTIONS)
SELECT 
    'TEST LECTURE' as info,
    id,
    title,
    published,
    created_at
FROM public.news 
WHERE published = true
ORDER BY created_at DESC
LIMIT 3;

-- 8. COMPTER TOUTES LES ACTUALITÉS
SELECT 
    'STATISTIQUES' as info,
    COUNT(*) as total_news,
    COUNT(*) FILTER (WHERE published = true) as published_news,
    COUNT(*) FILTER (WHERE published = false) as unpublished_news
FROM public.news;

-- 9. CRÉER UNE FONCTION PUBLIQUE SIMPLE POUR RÉCUPÉRER LES NEWS
CREATE OR REPLACE FUNCTION public.get_public_news(news_limit integer DEFAULT 10)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    excerpt text,
    image_url text,
    published boolean,
    created_at timestamptz,
    updated_at timestamptz,
    author_id uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        n.id,
        n.title,
        n.content,
        n.excerpt,
        n.image_url,
        n.published,
        n.created_at,
        n.updated_at,
        n.author_id
    FROM public.news n
    WHERE n.published = true
    ORDER BY n.created_at DESC
    LIMIT news_limit;
$$;

-- Accorder les droits sur cette fonction
GRANT EXECUTE ON FUNCTION public.get_public_news(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_news(integer) TO authenticated;

-- 10. TEST DE LA FONCTION
SELECT 'TEST FONCTION' as info, * FROM public.get_public_news(3);

-- ========================================
-- SÉCURITÉ COMPLÈTEMENT SUPPRIMÉE SUR NEWS
-- ACCÈS LIBRE POUR TOUS LES UTILISATEURS
-- FONCTION get_public_news() CRÉÉE
-- ========================================
