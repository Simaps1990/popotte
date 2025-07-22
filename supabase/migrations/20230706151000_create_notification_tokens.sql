-- Créer la table pour stocker les tokens de notification
CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Activer RLS pour la table
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité RLS
CREATE POLICY "Les utilisateurs peuvent voir leurs propres tokens"
  ON public.notification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs propres tokens"
  ON public.notification_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres tokens"
  ON public.notification_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencher pour mettre à jour updated_at
CREATE TRIGGER update_notification_tokens_updated_at
BEFORE UPDATE ON public.notification_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
