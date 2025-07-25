-- Script pour vérifier et réparer la table news
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier l'existence et la structure de la table news
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'news' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Compter le nombre d'actualités existantes
SELECT 
    COUNT(*) as total_news,
    COUNT(CASE WHEN published = true THEN 1 END) as published_news,
    COUNT(CASE WHEN published = false THEN 1 END) as unpublished_news
FROM news;

-- 3. Voir les actualités existantes (si il y en a)
SELECT 
    id,
    title,
    excerpt,
    published,
    created_at,
    author_id
FROM news 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Vérifier l'état de la table news
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'news';

-- 5. Vérifier l'état RLS de la table news
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'news';

-- 6. Lister toutes les policies sur la table news (si il y en a)
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'news';

-- 7. Créer une actualité de test si la table est vide
INSERT INTO news (
    title,
    content,
    excerpt,
    published,
    author_id,
    created_at,
    updated_at
) 
SELECT 
    'Bienvenue sur Popotte !',
    'Votre application fonctionne parfaitement. Cette actualité confirme que la connexion à la base de données est opérationnelle et que vous pouvez maintenant utiliser toutes les fonctionnalités de Popotte.',
    'Application opérationnelle - Test de connexion réussi',
    true,
    'f21e582c-7414-4905-9eef-0fe209ef1692', -- Votre ID utilisateur admin
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM news WHERE published = true);

-- 8. Créer une deuxième actualité de test
INSERT INTO news (
    title,
    content,
    excerpt,
    published,
    author_id,
    created_at,
    updated_at
) 
SELECT 
    'Actualités Popotte',
    'Découvrez les dernières nouveautés de votre association ! Commandes, produits, événements... Restez informés de toute l''actualité de Popotte grâce à cette section dédiée.',
    'Restez informés des nouveautés',
    true,
    'f21e582c-7414-4905-9eef-0fe209ef1692',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
WHERE (SELECT COUNT(*) FROM news WHERE published = true) < 2;

-- 9. Créer une troisième actualité de test
INSERT INTO news (
    title,
    content,
    excerpt,
    published,
    author_id,
    created_at,
    updated_at
) 
SELECT 
    'Système de commandes actif',
    'Le système de commandes de Popotte est maintenant pleinement opérationnel. Vous pouvez passer vos commandes, consulter vos dettes, et effectuer vos paiements en toute sécurité.',
    'Commandes et paiements disponibles',
    true,
    'f21e582c-7414-4905-9eef-0fe209ef1692',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
WHERE (SELECT COUNT(*) FROM news WHERE published = true) < 3;

-- 10. Vérification finale - afficher les actualités créées
SELECT 
    id,
    title,
    excerpt,
    published,
    created_at,
    author_id
FROM news 
WHERE published = true
ORDER BY created_at DESC;

-- 11. Test de performance - mesurer le temps de requête
EXPLAIN ANALYZE 
SELECT * 
FROM news 
WHERE published = true 
ORDER BY created_at DESC 
LIMIT 3;
