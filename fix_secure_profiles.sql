-- Script pour créer ou recréer la vue secure_profiles
-- Supprime la vue si elle existe déjà
DROP VIEW IF EXISTS secure_profiles;

-- Crée la vue secure_profiles
-- D'abord, vérifions les colonnes qui existent réellement dans la table profiles
-- Création de la vue avec toutes les colonnes qui existent réellement
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

-- Ajoute les politiques RLS nécessaires pour la table profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Supprime les politiques existantes pour éviter les erreurs
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON profiles;
DROP POLICY IF EXISTS "Les administrateurs peuvent voir tous les profils" ON profiles;

-- Crée les politiques simplifiées
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Version simplifiée pour les administrateurs - permet l'accès si le rôle est 'admin'
CREATE POLICY "Les administrateurs peuvent voir tous les profils" 
ON profiles FOR ALL 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Accorde les permissions nécessaires
GRANT SELECT ON secure_profiles TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
