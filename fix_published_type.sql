-- Script pour corriger le type published (string vers boolean)
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Voir le problème actuel
SELECT id, title, published, pg_typeof(published) as type_published 
FROM news 
ORDER BY created_at DESC;

-- 2. Corriger toutes les valeurs string 'true' vers boolean true
UPDATE news 
SET published = true 
WHERE published::text = 'true';

-- 3. Corriger toutes les valeurs string 'false' vers boolean false
UPDATE news 
SET published = false 
WHERE published::text = 'false';

-- 4. Vérifier la correction
SELECT id, title, published, pg_typeof(published) as type_published 
FROM news 
ORDER BY created_at DESC;

-- 5. Test de la requête qui pose problème
SELECT * 
FROM news 
WHERE published = true 
ORDER BY created_at DESC 
LIMIT 3;
