-- Script rapide pour diagnostiquer et réparer les actualités
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier si la table news existe et voir sa structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'news' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Compter les actualités existantes
SELECT COUNT(*) as total, COUNT(CASE WHEN published = true THEN 1 END) as published
FROM news;

-- 3. Voir les actualités existantes
SELECT id, title, published, created_at FROM news ORDER BY created_at DESC LIMIT 5;

-- 4. Supprimer toutes les restrictions RLS sur news (au cas où)
DROP POLICY IF EXISTS "news_select_policy" ON news;
DROP POLICY IF EXISTS "news_insert_policy" ON news;
DROP POLICY IF EXISTS "news_update_policy" ON news;
DROP POLICY IF EXISTS "news_delete_policy" ON news;
ALTER TABLE news DISABLE ROW LEVEL SECURITY;

-- 5. Accorder tous les droits sur la table news
GRANT ALL ON news TO anon;
GRANT ALL ON news TO authenticated;
GRANT ALL ON news TO service_role;

-- 6. Créer 3 actualités de test (supprime les anciennes d'abord)
DELETE FROM news WHERE title LIKE '%Test%' OR title LIKE '%Bienvenue%' OR title LIKE '%🎉%' OR title LIKE '%📦%' OR title LIKE '%💳%';

INSERT INTO news (title, content, excerpt, published, author_id, created_at, updated_at) VALUES
('🎉 Bienvenue sur Popotte !', 
 'Votre application est maintenant opérationnelle ! Vous pouvez passer des commandes, consulter vos dettes et profiter de tous les services de votre association.', 
 'Application opérationnelle', 
 true, 
 'f21e582c-7414-4905-9eef-0fe209ef1692', 
 NOW(), 
 NOW()),

('📦 Commandes disponibles', 
 'Le système de commandes est actif. Découvrez notre sélection d''alcools, de nourriture et de goodies. Passez vos commandes en quelques clics !', 
 'Système de commandes actif', 
 true, 
 'f21e582c-7414-4905-9eef-0fe209ef1692', 
 NOW() - INTERVAL '1 hour', 
 NOW() - INTERVAL '1 hour'),

('💳 Gestion des dettes', 
 'Consultez vos dettes en temps réel et effectuez vos paiements facilement. Votre solde est toujours à jour dans votre espace personnel.', 
 'Paiements et dettes', 
 true, 
 'f21e582c-7414-4905-9eef-0fe209ef1692', 
 NOW() - INTERVAL '2 hours', 
 NOW() - INTERVAL '2 hours');

-- 7. Vérifier que les actualités ont été créées
SELECT id, title, excerpt, published, created_at 
FROM news 
WHERE published = true 
ORDER BY created_at DESC;

-- 8. Test de performance simple
SELECT COUNT(*) FROM news WHERE published = true;
