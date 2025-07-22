-- Création de la table news pour stocker les articles
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  published BOOLEAN DEFAULT true,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les politiques RLS pour la table news
-- Tout le monde peut lire les articles publiés
CREATE POLICY "Les articles publiés sont visibles par tous" 
  ON news FOR SELECT 
  USING (published = true);

-- Les administrateurs peuvent tout faire
CREATE POLICY "Les administrateurs peuvent tout faire" 
  ON news FOR ALL 
  USING (
    auth.jwt() ->> 'app_metadata'::text LIKE '%"roles":[%"admin"%]%' OR
    auth.jwt() ->> 'app_metadata'::text LIKE '%"roles":[%"admin"%,%]%' OR
    auth.jwt() ->> 'app_metadata'::text LIKE '%[%"admin"%]%'
  );

-- Activer RLS sur la table news
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
