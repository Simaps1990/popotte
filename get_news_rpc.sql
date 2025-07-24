-- Fonction RPC pour récupérer les actualités sans passer par l'API REST standard
-- Cette fonction contourne les problèmes potentiels de timeout en accédant directement à la table
CREATE OR REPLACE FUNCTION get_news_items(max_items integer DEFAULT 3, published_only boolean DEFAULT true)
RETURNS SETOF news
SECURITY DEFINER -- Exécution avec les privilèges du créateur (contourne RLS)
AS $$
BEGIN
  IF published_only THEN
    RETURN QUERY 
      SELECT * FROM news 
      WHERE published = true 
      ORDER BY created_at DESC 
      LIMIT max_items;
  ELSE
    RETURN QUERY 
      SELECT * FROM news 
      ORDER BY created_at DESC 
      LIMIT max_items;
  END IF;
END;
$$ LANGUAGE plpgsql;
