-- =====================================================
-- SYSTÈME KEEP-ALIVE POUR EMPÊCHER LA MISE EN VEILLE
-- =====================================================
-- Ce script crée une table et une fonction RPC pour
-- maintenir Supabase actif via des pings externes
-- =====================================================

-- 1. Créer la table _keepalive
CREATE TABLE IF NOT EXISTS public._keepalive (
  id BIGSERIAL PRIMARY KEY,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'cron-job'
);

-- 2. Ajouter un commentaire explicatif
COMMENT ON TABLE public._keepalive IS 'Table technique pour maintenir Supabase actif via des pings réguliers (cron-job tous les 3 jours)';

-- 3. Activer RLS (mais autoriser tout le monde à ping)
ALTER TABLE public._keepalive ENABLE ROW LEVEL SECURITY;

-- 4. Policy pour permettre à tout le monde de lire (pour vérification)
CREATE POLICY "Tout le monde peut lire _keepalive"
  ON public._keepalive
  FOR SELECT
  TO public
  USING (true);

-- 5. Policy pour permettre à tout le monde d'insérer (pour le ping)
CREATE POLICY "Tout le monde peut ping _keepalive"
  ON public._keepalive
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 6. Créer une fonction RPC publique pour le ping
CREATE OR REPLACE FUNCTION public.keepalive_ping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ping_id BIGINT;
  v_total_pings BIGINT;
BEGIN
  -- Insérer un nouveau ping
  INSERT INTO public._keepalive (pinged_at, source)
  VALUES (NOW(), 'cron-job')
  RETURNING id INTO v_ping_id;

  -- Compter le nombre total de pings
  SELECT COUNT(*) INTO v_total_pings FROM public._keepalive;

  -- Nettoyer les anciens pings (garder seulement les 100 derniers)
  DELETE FROM public._keepalive
  WHERE id NOT IN (
    SELECT id FROM public._keepalive
    ORDER BY pinged_at DESC
    LIMIT 100
  );

  -- Retourner les informations
  RETURN jsonb_build_object(
    'success', true,
    'ping_id', v_ping_id,
    'total_pings', v_total_pings,
    'pinged_at', NOW(),
    'message', 'Supabase keep-alive ping successful'
  );
END;
$$;

-- 7. Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.keepalive_ping() TO anon;
GRANT EXECUTE ON FUNCTION public.keepalive_ping() TO authenticated;

-- 8. Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_keepalive_pinged_at 
  ON public._keepalive(pinged_at DESC);

-- 9. Insérer un premier ping de test
INSERT INTO public._keepalive (pinged_at, source)
VALUES (NOW(), 'initial_setup');

-- 10. Afficher les informations de configuration
DO $$
DECLARE
  v_project_url TEXT;
BEGIN
  -- Récupérer l'URL du projet (si disponible)
  SELECT current_setting('app.settings.project_url', true) INTO v_project_url;
  
  RAISE NOTICE '✅ Système keep-alive créé avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CONFIGURATION CRON-JOB.ORG :';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '1. Aller sur https://cron-job.org (gratuit, sans inscription)';
  RAISE NOTICE '2. Créer un nouveau cron job avec ces paramètres :';
  RAISE NOTICE '';
  RAISE NOTICE '   📌 URL à appeler :';
  RAISE NOTICE '   https://VOTRE_PROJET.supabase.co/rest/v1/rpc/keepalive_ping';
  RAISE NOTICE '';
  RAISE NOTICE '   📌 Méthode HTTP : POST';
  RAISE NOTICE '';
  RAISE NOTICE '   📌 Headers requis :';
  RAISE NOTICE '   apikey: VOTRE_ANON_KEY';
  RAISE NOTICE '   Content-Type: application/json';
  RAISE NOTICE '';
  RAISE NOTICE '   📌 Fréquence : Tous les 3 jours (72 heures)';
  RAISE NOTICE '';
  RAISE NOTICE '   📌 Body (optionnel) : {}';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTER MANUELLEMENT :';
  RAISE NOTICE 'SELECT public.keepalive_ping();';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VÉRIFIER LES PINGS :';
  RAISE NOTICE 'SELECT * FROM public._keepalive ORDER BY pinged_at DESC LIMIT 10;';
END $$;
