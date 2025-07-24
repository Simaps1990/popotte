-- Activer RLS sur la table news (si ce n'est pas déjà fait)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Allow anonymous users to read published news" ON public.news;
DROP POLICY IF EXISTS "Allow authenticated users to read published news" ON public.news;
DROP POLICY IF EXISTS "Allow admins to read all news" ON public.news;
DROP POLICY IF EXISTS "Allow admins to insert news" ON public.news;
DROP POLICY IF EXISTS "Allow admins to update news" ON public.news;
DROP POLICY IF EXISTS "Allow admins to delete news" ON public.news;

-- Créer une politique pour permettre aux utilisateurs non authentifiés de lire les actualités publiées
CREATE POLICY "Allow anonymous users to read published news" 
ON public.news
FOR SELECT 
TO anon
USING (published = true);

-- Créer une politique pour permettre aux utilisateurs authentifiés de lire les actualités publiées
CREATE POLICY "Allow authenticated users to read published news" 
ON public.news
FOR SELECT 
TO authenticated
USING (published = true);

-- Créer une politique pour permettre aux administrateurs de lire TOUTES les actualités
CREATE POLICY "Allow admins to read all news" 
ON public.news
FOR SELECT 
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Créer une politique pour permettre aux administrateurs d'insérer des actualités
CREATE POLICY "Allow admins to insert news" 
ON public.news
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Créer une politique pour permettre aux administrateurs de mettre à jour des actualités
CREATE POLICY "Allow admins to update news" 
ON public.news
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Créer une politique pour permettre aux administrateurs de supprimer des actualités
CREATE POLICY "Allow admins to delete news" 
ON public.news
FOR DELETE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
