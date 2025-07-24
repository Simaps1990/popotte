-- Activer RLS sur la table news (si ce n'est pas déjà fait)
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Supprimer la politique existante pour les utilisateurs anonymes si elle existe
DROP POLICY IF EXISTS "Allow anonymous users to read published news" ON public.news;

-- Créer une politique pour permettre aux utilisateurs non authentifiés de lire les actualités publiées
CREATE POLICY "Allow anonymous users to read published news" 
ON public.news
FOR SELECT 
TO anon
USING (published = true);



-- Créer une politique pour permettre aux utilisateurs authentifiés de lire les actualités publiées
DROP POLICY IF EXISTS "Allow authenticated users to read published news" ON public.news;
CREATE POLICY "Allow authenticated users to read published news" 
ON public.news
FOR SELECT 
TO authenticated
USING (published = true);

-- Note: Les administrateurs auront besoin de politiques séparées pour gérer toutes les actualités
-- Ces politiques sont généralement déjà configurées dans votre système
