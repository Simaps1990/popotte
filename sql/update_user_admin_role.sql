-- Fonction RPC pour mettre à jour le rôle admin d'un utilisateur
-- Cette fonction met à jour à la fois le profil et les métadonnées auth
-- Utilisation : SELECT update_user_admin_role('user_id', 'admin' ou 'user');

CREATE OR REPLACE FUNCTION update_user_admin_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_metadata JSONB;
  current_roles TEXT[];
  new_roles TEXT[];
  result JSON;
BEGIN
  -- Vérifier que le rôle est valide
  IF new_role NOT IN ('admin', 'user') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rôle invalide. Doit être "admin" ou "user"'
    );
  END IF;

  -- Vérifier que l'utilisateur existe dans auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Utilisateur introuvable dans auth.users'
    );
  END IF;

  -- 1. Mettre à jour le profil dans la table profiles
  UPDATE profiles 
  SET 
    role = new_role,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Vérifier que la mise à jour du profil a réussi
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Utilisateur introuvable dans profiles'
    );
  END IF;

  -- 2. Récupérer les métadonnées actuelles
  SELECT raw_app_meta_data INTO current_metadata
  FROM auth.users 
  WHERE id = target_user_id;

  -- Initialiser les métadonnées si elles n'existent pas
  IF current_metadata IS NULL THEN
    current_metadata := '{}'::jsonb;
  END IF;

  -- 3. Traiter le tableau des rôles
  IF current_metadata ? 'roles' THEN
    -- Convertir les rôles existants en tableau
    IF jsonb_typeof(current_metadata->'roles') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(current_metadata->'roles')) INTO current_roles;
    ELSE
      -- Si c'est une chaîne, essayer de la parser
      BEGIN
        SELECT ARRAY(SELECT jsonb_array_elements_text(to_jsonb(current_metadata->>'roles'))) INTO current_roles;
      EXCEPTION WHEN OTHERS THEN
        current_roles := ARRAY[]::TEXT[];
      END;
    END IF;
  ELSE
    current_roles := ARRAY[]::TEXT[];
  END IF;

  -- 4. Construire le nouveau tableau de rôles
  IF new_role = 'admin' THEN
    -- Ajouter admin si pas déjà présent
    IF NOT ('admin' = ANY(current_roles)) THEN
      new_roles := current_roles || ARRAY['admin'];
    ELSE
      new_roles := current_roles;
    END IF;
  ELSE
    -- Retirer admin si présent
    new_roles := ARRAY(SELECT unnest(current_roles) EXCEPT SELECT 'admin');
  END IF;

  -- Supprimer les doublons
  new_roles := ARRAY(SELECT DISTINCT unnest(new_roles));

  -- 5. Mettre à jour les métadonnées dans auth.users
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    current_metadata,
    '{roles}',
    to_jsonb(new_roles)
  )
  WHERE id = target_user_id;

  -- 6. Construire la réponse de succès
  result := json_build_object(
    'success', true,
    'user_id', target_user_id,
    'new_role', new_role,
    'profile_updated', true,
    'metadata_updated', true,
    'roles', array_to_json(new_roles),
    'timestamp', extract(epoch from now())
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, retourner les détails
  RETURN json_build_object(
    'success', false,
    'error', 'Erreur lors de la mise à jour: ' || SQLERRM,
    'error_detail', SQLSTATE
  );
END;
$$;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION update_user_admin_role(UUID, TEXT) TO authenticated;

-- Fonction de test pour vérifier le bon fonctionnement
CREATE OR REPLACE FUNCTION test_admin_role_update()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  test_result JSON;
BEGIN
  -- Cette fonction peut être utilisée pour tester la mise à jour des rôles
  -- Remplacez 'test-user-id' par un ID utilisateur réel pour tester
  
  RETURN 'Fonction update_user_admin_role créée avec succès. Utilisez SELECT update_user_admin_role(''user_id'', ''admin'') pour promouvoir un utilisateur.';
END;
$$;

-- Commentaires d'utilisation
COMMENT ON FUNCTION update_user_admin_role(UUID, TEXT) IS 
'Met à jour le rôle admin d''un utilisateur de manière atomique. 
Synchronise le champ role dans profiles et app_metadata.roles dans auth.users.
Usage: SELECT update_user_admin_role(''user_id'', ''admin'') ou SELECT update_user_admin_role(''user_id'', ''user'')';
