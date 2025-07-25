-- SUPPRESSION COMPLÈTE DE TOUTES LES RESTRICTIONS SUR LA TABLE NEWS
-- Rendre les actualités publiques pour tous (connectés et anonymes)

-- 1. Supprimer toutes les politiques RLS existantes sur la table news
DROP POLICY IF EXISTS "Users can view published news" ON news;
DROP POLICY IF EXISTS "Admins can view all news" ON news;
DROP POLICY IF EXISTS "Admins can insert news" ON news;
DROP POLICY IF EXISTS "Admins can update news" ON news;
DROP POLICY IF EXISTS "Admins can delete news" ON news;
DROP POLICY IF EXISTS "Public can view published news" ON news;
DROP POLICY IF EXISTS "Anyone can view published news" ON news;
DROP POLICY IF EXISTS "Enable read access for all users" ON news;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON news;
DROP POLICY IF EXISTS "Enable update for users based on email" ON news;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON news;

-- 2. Désactiver complètement RLS sur la table news
ALTER TABLE news DISABLE ROW LEVEL SECURITY;

-- 3. Accorder tous les droits à tous les rôles (authenticated, anon, service_role)
GRANT ALL ON news TO anon;
GRANT ALL ON news TO authenticated;
GRANT ALL ON news TO service_role;

-- 4. (Pas de séquence car la table news utilise des UUID)

-- 5. Recréer la fonction get_news_items sans SECURITY DEFINER (plus besoin)
DROP FUNCTION IF EXISTS get_news_items(integer, boolean);

CREATE OR REPLACE FUNCTION get_news_items(
  max_items integer DEFAULT 3, 
  published_only boolean DEFAULT true
)
RETURNS TABLE(
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
LANGUAGE plpgsql
AS $$
BEGIN
  -- Plus besoin de SECURITY DEFINER car la table est maintenant publique
  IF published_only THEN
    RETURN QUERY 
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
      FROM news n
      WHERE n.published = true 
      ORDER BY n.created_at DESC 
      LIMIT max_items;
  ELSE
    RETURN QUERY 
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
      FROM news n
      ORDER BY n.created_at DESC 
      LIMIT max_items;
  END IF;
END;
$$;

-- 6. Accorder les droits d'exécution sur la fonction
GRANT EXECUTE ON FUNCTION get_news_items(integer, boolean) TO anon;
GRANT EXECUTE ON FUNCTION get_news_items(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_news_items(integer, boolean) TO service_role;

-- 7. Vérifier que tout fonctionne
SELECT 'TOUTES LES RESTRICTIONS SUR LA TABLE NEWS ONT ÉTÉ SUPPRIMÉES - ACCÈS PUBLIC TOTAL' as status;

-- 8. Test rapide pour vérifier l'accès
SELECT COUNT(*) as nombre_actualites FROM news;
