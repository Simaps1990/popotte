-- Script pour créer un bucket de stockage et configurer les politiques RLS
-- Ce script doit être exécuté avec les privilèges d'administrateur dans Supabase

-- 1. Création du bucket 'public' pour le stockage des images
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Création du bucket 'news' spécifique pour les actualités (alternative)
INSERT INTO storage.buckets (id, name, public)
VALUES ('news', 'news', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Configuration des politiques RLS pour le bucket 'public'
-- Politique pour permettre à tous les utilisateurs authentifiés de télécharger des fichiers
CREATE POLICY "Utilisateurs authentifiés peuvent télécharger des fichiers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public');

-- Politique pour permettre à tous de voir les fichiers publics
CREATE POLICY "Tout le monde peut voir les fichiers publics"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public');

-- Politique pour permettre aux utilisateurs authentifiés de mettre à jour leurs propres fichiers
CREATE POLICY "Utilisateurs authentifiés peuvent mettre à jour leurs fichiers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public' AND auth.uid() = owner);

-- Politique pour permettre aux utilisateurs authentifiés de supprimer leurs propres fichiers
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer leurs fichiers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public' AND auth.uid() = owner);

-- 4. Configuration des politiques RLS pour le bucket 'news'
-- Politique pour permettre aux administrateurs de télécharger des fichiers dans le bucket news
CREATE POLICY "Administrateurs peuvent télécharger des fichiers news"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'news' AND 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND 
    auth.users.raw_app_meta_data->>'roles' LIKE '%admin%'
  )
);

-- Politique pour permettre à tous de voir les fichiers news
CREATE POLICY "Tout le monde peut voir les fichiers news"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'news');

-- Politique pour permettre aux administrateurs de mettre à jour les fichiers news
CREATE POLICY "Administrateurs peuvent mettre à jour les fichiers news"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'news' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND 
    auth.users.raw_app_meta_data->>'roles' LIKE '%admin%'
  )
);

-- Politique pour permettre aux administrateurs de supprimer les fichiers news
CREATE POLICY "Administrateurs peuvent supprimer les fichiers news"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'news' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND 
    auth.users.raw_app_meta_data->>'roles' LIKE '%admin%'
  )
);

-- Remarque: Ce script crée à la fois un bucket 'public' général et un bucket 'news' spécifique
-- Vous pouvez utiliser celui qui correspond le mieux à votre organisation
-- Le code React essaiera les deux, donc les deux fonctionneront
