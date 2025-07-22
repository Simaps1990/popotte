-- Migration pour mettre à jour le schéma des produits

-- 1. Sauvegarde des données existantes
CREATE TABLE IF NOT EXISTS backup_products_20240707 AS TABLE products;

-- 2. Désactiver temporairement les contraintes de clé étrangère
ALTER TABLE IF EXISTS order_items 
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- 3. Créer la nouvelle table product_stock_variants si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.product_stock_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_stock_variants_product_id_name_key UNIQUE (product_id, name)
);

-- 4. Mettre à jour la table products avec les nouveaux champs
DO $$
BEGIN
  -- Ajouter les colonnes si elles n'existent pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'stock_enabled') THEN
    ALTER TABLE products ADD COLUMN stock_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
    ALTER TABLE products ADD COLUMN stock_quantity INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'display_order') THEN
    ALTER TABLE products ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Mettre à jour les valeurs par défaut
  UPDATE products 
  SET 
    stock_enabled = COALESCE(stock_enabled, false),
    stock_quantity = CASE WHEN stock_quantity IS NULL AND is_available = true THEN 0 ELSE stock_quantity END,
    display_order = COALESCE(display_order, 0);
  
  -- Mettre à jour les contraintes existantes
  ALTER TABLE products 
    ALTER COLUMN stock_enabled SET NOT NULL,
    ALTER COLUMN display_order SET NOT NULL;
    
END $$;

-- 5. Créer ou mettre à jour la vue secure_products
CREATE OR REPLACE VIEW public.secure_products AS
SELECT 
  p.*,
  c.name as category_name
FROM 
  public.products p
LEFT JOIN 
  public.categories c ON p.category_id = c.id;

-- 6. Activer RLS sur les nouvelles tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock_variants ENABLE ROW LEVEL SECURITY;

-- 7. Politiques de sécurité pour les produits
DO $$
BEGIN
  -- Supprimer les politiques existantes si elles existent
  DROP POLICY IF EXISTS "Tout le monde peut voir les produits disponibles" ON public.products;
  DROP POLICY IF EXISTS "Les administrateurs peuvent tout faire sur les produits" ON public.products;
  
  -- Créer les nouvelles politiques
  CREATE POLICY "Tout le monde peut voir les produits disponibles"
    ON public.products
    FOR SELECT
    USING (is_available = true);

  CREATE POLICY "Les administrateurs peuvent tout faire sur les produits"
    ON public.products
    FOR ALL
    USING (auth.role() = 'authenticated' AND 
           EXISTS (
             SELECT 1 FROM public.profiles 
             WHERE id = auth.uid() AND role = 'admin'
           ));
END $$;

-- 8. Politiques pour les variantes de stock
DO $$
BEGIN
  DROP POLICY IF EXISTS "Tout le monde peut voir les variantes de stock" ON public.product_stock_variants;
  DROP POLICY IF EXISTS "Les administrateurs peuvent gérer les variantes de stock" ON public.product_stock_variants;
  
  CREATE POLICY "Tout le monde peut voir les variantes de stock"
    ON public.product_stock_variants
    FOR SELECT
    USING (true);

  CREATE POLICY "Les administrateurs peuvent gérer les variantes de stock"
    ON public.product_stock_variants
    FOR ALL
    USING (auth.role() = 'authenticated' AND 
           EXISTS (
             SELECT 1 FROM public.profiles 
             WHERE id = auth.uid() AND role = 'admin'
           ));
END $$;

-- 9. Fonction pour mettre à jour les timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Déclencheurs pour les timestamps
DO $$
BEGIN
  -- Supprimer les déclencheurs existants s'ils existent
  DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
  DROP TRIGGER IF EXISTS update_product_stock_variants_updated_at ON public.product_stock_variants;
  
  -- Créer les déclencheurs
  CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_product_stock_variants_updated_at
  BEFORE UPDATE ON public.product_stock_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 11. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products(display_order);
CREATE INDEX IF NOT EXISTS idx_product_stock_variants_product_id ON public.product_stock_variants(product_id);

-- 12. Réactiver les contraintes de clé étrangère
ALTER TABLE order_items 
  ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- 13. Insérer des données de test si nécessaire (optionnel)
-- INSERT INTO public.products (...) VALUES (...);

-- 14. Nettoyage (à exécuter après vérification)
-- DROP TABLE IF EXISTS backup_products_20240707;
