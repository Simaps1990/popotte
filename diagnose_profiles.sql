-- Script de diagnostic pour la table profiles et la vue secure_profiles

-- 1. Vérifier si la vue secure_profiles existe
SELECT EXISTS (
   SELECT 1
   FROM   information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name = 'secure_profiles'
);

-- 2. Vérifier la structure de la vue secure_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'secure_profiles'
ORDER BY ordinal_position;

-- 3. Vérifier les politiques RLS sur la table profiles
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 4. Vérifier les permissions sur la vue secure_profiles
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'secure_profiles';

-- 5. Vérifier les permissions sur la table profiles
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'profiles';

-- 6. Solution alternative : Supprimer toutes les restrictions RLS sur la table profiles
-- Décommenter ces lignes si vous voulez supprimer toutes les restrictions
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON profiles;
-- DROP POLICY IF EXISTS "Les administrateurs peuvent voir tous les profils" ON profiles;
-- GRANT ALL ON profiles TO anon, authenticated;
-- GRANT ALL ON secure_profiles TO anon, authenticated;
