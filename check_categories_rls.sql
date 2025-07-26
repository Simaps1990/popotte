-- Script pour vérifier la structure des politiques RLS et des tables

-- 1. Vérifier les politiques RLS actuelles sur la table categories
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'categories';

-- 2. Vérifier si la table categories a RLS activé
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'categories';

-- 3. Vérifier la structure de la table categories
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- 4. Vérifier les métadonnées utilisateur pour comprendre la structure
SELECT 
    id,
    email,
    CASE 
        WHEN raw_app_meta_data IS NOT NULL THEN 'raw_app_meta_data présent'
        ELSE 'raw_app_meta_data absent'
    END as raw_app_meta_data_status,
    CASE 
        WHEN raw_user_meta_data IS NOT NULL THEN 'raw_user_meta_data présent'
        ELSE 'raw_user_meta_data absent'
    END as raw_user_meta_data_status,
    -- Note: Using raw_app_meta_data and raw_user_meta_data instead
    CASE 
        WHEN raw_app_meta_data IS NOT NULL THEN 'raw_app_meta_data présent'
        ELSE 'raw_app_meta_data absent'
    END as app_metadata_status,
    CASE 
        WHEN raw_user_meta_data IS NOT NULL THEN 'raw_user_meta_data présent'
        ELSE 'raw_user_meta_data absent'
    END as user_metadata_status
FROM auth.users
LIMIT 10;

-- 5. Vérifier le type exact des métadonnées pour un utilisateur admin
SELECT 
    id,
    email,
    pg_typeof(raw_app_meta_data) as raw_app_meta_data_type,
    pg_typeof(raw_user_meta_data) as raw_user_meta_data_type,
    -- Note: Using raw_app_meta_data and raw_user_meta_data instead
    pg_typeof(raw_app_meta_data) as app_metadata_type,
    pg_typeof(raw_user_meta_data) as user_metadata_type
FROM auth.users
WHERE email = 'boyer_thomas@hotmail.fr'
OR user_metadata->>'role' = 'admin'
OR app_metadata->>'roles' ? 'admin'
LIMIT 1;

-- 6. Vérifier les rôles admin pour comprendre la structure exacte
SELECT 
    id,
    email,
    raw_app_meta_data->'roles' as raw_app_roles,
    raw_user_meta_data->'role' as raw_user_role,
    -- Note: Using raw_app_meta_data and raw_user_meta_data instead
    raw_app_meta_data->'roles' as app_roles,
    raw_user_meta_data->'role' as user_role
FROM auth.users
WHERE email = 'boyer_thomas@hotmail.fr'
OR user_metadata->>'role' = 'admin'
OR app_metadata->>'roles' ? 'admin'
LIMIT 5;
