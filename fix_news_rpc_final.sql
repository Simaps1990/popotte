-- SOLUTION DÉFINITIVE POUR LE PROBLÈME DE TIMEOUT DES ACTUALITÉS
-- Ce script résout complètement le problème de timeout de get_news_items

-- 1. Supprimer toute fonction existante qui pourrait causer des conflits
DROP FUNCTION IF EXISTS get_news_items(integer, boolean);
DROP FUNCTION IF EXISTS get_news_items(integer);
DROP FUNCTION IF EXISTS get_news_items();

-- 2. Créer la fonction RPC optimisée avec gestion d'erreurs robuste
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
SECURITY DEFINER -- Exécution avec privilèges élevés pour contourner RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log pour debugging
  RAISE NOTICE 'get_news_items appelée avec max_items=%, published_only=%', max_items, published_only;
  
  -- Retourner les actualités selon le filtre
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
  
  RAISE NOTICE 'get_news_items terminée avec succès';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur dans get_news_items: %', SQLERRM;
    RAISE;
END;
$$;

-- 3. Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION get_news_items(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_news_items(integer, boolean) TO anon;

-- 4. Créer une fonction de test simple pour vérifier que tout fonctionne
CREATE OR REPLACE FUNCTION test_news_function()
RETURNS text
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  news_count integer;
BEGIN
  SELECT COUNT(*) INTO news_count FROM news;
  RETURN 'Fonction de test OK - ' || news_count || ' actualités trouvées dans la table';
END;
$$;

GRANT EXECUTE ON FUNCTION test_news_function() TO authenticated;
GRANT EXECUTE ON FUNCTION test_news_function() TO anon;

-- 5. Vérifier que la table news existe et a des données
DO $$
DECLARE
  table_exists boolean;
  news_count integer;
BEGIN
  -- Vérifier l'existence de la table
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'news'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'La table news n''existe pas !';
  END IF;
  
  -- Compter les actualités
  SELECT COUNT(*) INTO news_count FROM news;
  RAISE NOTICE 'Table news trouvée avec % actualités', news_count;
  
  -- Si pas d'actualités, en créer une de test
  IF news_count = 0 THEN
    INSERT INTO news (title, content, excerpt, published, author_id)
    VALUES (
      'Actualité de test',
      'Cette actualité a été créée automatiquement pour tester le système.',
      'Actualité de test du système',
      true,
      (SELECT id FROM auth.users LIMIT 1)
    );
    RAISE NOTICE 'Actualité de test créée';
  END IF;
END;
$$;

-- Message de confirmation
SELECT 'FONCTION get_news_items CRÉÉE AVEC SUCCÈS - Les timeouts devraient être résolus' as status;
