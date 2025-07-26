-- Script pour corriger le problème de duplication des dettes
-- Ajoute une contrainte unique sur la table debts pour éviter les duplications

-- 1. Vérifier les dettes dupliquées existantes
SELECT user_id, order_id, amount, description, COUNT(*) as duplicate_count
FROM debts
WHERE order_id IS NOT NULL
GROUP BY user_id, order_id, amount, description
HAVING COUNT(*) > 1;

-- 2. Supprimer les dettes dupliquées (garder seulement la plus ancienne)
-- Exécuter cette requête après avoir vérifié les duplications
DELETE FROM debts
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id, order_id, amount, description ORDER BY created_at) as rn
        FROM debts
        WHERE order_id IS NOT NULL
    ) t
    WHERE rn > 1
);

-- 3. Ajouter une contrainte unique pour empêcher les futures duplications
-- Cette contrainte garantit qu'il ne peut pas y avoir deux dettes avec le même user_id, order_id, amount et description
ALTER TABLE debts
ADD CONSTRAINT unique_debt_per_order UNIQUE (user_id, order_id, amount, description);

-- 4. Ajouter un index pour améliorer les performances des requêtes sur les dettes
CREATE INDEX IF NOT EXISTS idx_debts_user_order ON debts (user_id, order_id);

-- Note: Si la contrainte ne peut pas être ajoutée à cause de données existantes,
-- il faudra d'abord nettoyer les données dupliquées avec la requête de suppression ci-dessus
