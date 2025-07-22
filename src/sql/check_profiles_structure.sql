-- Vérifier si la table profiles existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'profiles'
);

-- Afficher la structure de la table profiles si elle existe
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY 
    ordinal_position;

-- Vérifier les politiques RLS sur la table profiles
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename = 'profiles';

-- Vérifier comment les métadonnées utilisateur sont stockées dans auth.users
SELECT
    id,
    email,
    raw_user_meta_data,
    raw_app_meta_data
FROM
    auth.users
LIMIT 5;

-- Vérifier s'il existe une vue sécurisée pour les profils
SELECT EXISTS (
   SELECT FROM information_schema.views
   WHERE table_schema = 'public'
   AND table_name = 'user_profiles_view'
);

-- Vérifier s'il existe d'autres tables liées aux profils
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_name LIKE '%profile%' OR table_name LIKE '%user%';
