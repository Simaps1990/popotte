-- Script pour supprimer TOUTES les restrictions sur la table profiles
-- Solution radicale pour garantir l'accès aux profils

-- 1. Désactiver complètement RLS sur la table profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON profiles;
DROP POLICY IF EXISTS "Les administrateurs peuvent voir tous les profils" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON profiles;

-- 3. Recréer la vue secure_profiles sans restrictions
DROP VIEW IF EXISTS secure_profiles;
CREATE VIEW secure_profiles AS
SELECT 
    id,
    username,
    first_name,
    last_name,
    avatar_url,
    role,
    phone,
    address,
    created_at,
    updated_at,
    email
FROM 
    profiles;

-- 4. Accorder toutes les permissions sur la table et la vue
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON secure_profiles TO anon, authenticated;

-- 5. Vérifier que la vue existe bien
SELECT EXISTS (
   SELECT 1
   FROM   information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name = 'secure_profiles'
);
