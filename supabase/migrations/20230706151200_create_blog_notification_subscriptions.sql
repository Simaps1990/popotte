-- Créer la table pour stocker les préférences de notification
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Activer RLS pour la table
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité RLS
CREATE POLICY "Les utilisateurs peuvent voir leurs préférences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent gérer leurs préférences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Fonction pour insérer les préférences par défaut
CREATE OR REPLACE FUNCTION handle_new_user_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, blog_notifications)
  VALUES (NEW.id, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencher pour créer les préférences lors de l'inscription
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user_notification_prefs();

-- Mettre à jour la table des tokens pour inclure le type de notification
ALTER TABLE public.notification_tokens
ADD COLUMN IF NOT EXISTS notification_types TEXT[] DEFAULT '{}';

-- Mettre à jour la fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencher pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
