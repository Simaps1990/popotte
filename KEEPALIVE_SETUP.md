# 🔄 Configuration Keep-Alive Supabase (Netlify)

Ce guide explique comment empêcher Supabase de se mettre en pause après 7 jours d'inactivité en utilisant une **Netlify Scheduled Function**.

## 📋 Étape 1 : Exécuter le script SQL

1. Ouvrir le **SQL Editor** dans Supabase Dashboard
2. Copier-coller le contenu de `supabase/migrations/create_keepalive_system.sql`
3. Exécuter le script
4. Vérifier que tout s'est bien passé (message de succès)

## 🧪 Étape 2 : Tester la fonction

Dans le SQL Editor de Supabase, exécuter :

```sql
SELECT public.keepalive_ping();
```

Résultat attendu :
```json
{
  "success": true,
  "ping_id": 2,
  "total_pings": 2,
  "pinged_at": "2025-01-09T...",
  "message": "Supabase keep-alive ping successful"
}
```

## 🚀 Étape 3 : Déployer sur Netlify

### Déploiement automatique

1. **Aller sur** : https://cron-job.org/en/
2. **Créer un compte gratuit** (optionnel mais recommandé)
3. **Créer un nouveau cron job** avec ces paramètres :

#### Configuration de base
- **Title** : `Supabase Keep-Alive`
- **URL** : `https://VOTRE_PROJET.supabase.co/rest/v1/rpc/keepalive_ping`
  - Remplacer `VOTRE_PROJET` par votre URL Supabase
  - Exemple : `https://abcdefghijklmnop.supabase.co/rest/v1/rpc/keepalive_ping`

#### Méthode HTTP
- **Method** : `POST`

#### Headers
Ajouter ces 2 headers :

| Header | Value |
|--------|-------|
| `apikey` | Votre clé `anon` (public) de Supabase |
| `Content-Type` | `application/json` |

**Où trouver votre `anon key` ?**
- Dashboard Supabase → Settings → API → Project API keys → `anon` `public`

#### Body (Request Body)
- **Type** : `JSON`
- **Content** : `{}`

#### Fréquence (Schedule)
- **Every** : `3 days` (72 heures)
- Ou configurer manuellement : `0 0 */3 * *` (tous les 3 jours à minuit)

#### Notifications (optionnel)
- Activer les notifications par email en cas d'échec

### Option B : EasyCron (Alternative gratuite)

1. **Aller sur** : https://www.easycron.com/
2. **Créer un compte gratuit**
3. **Créer un cron job** :
   - **URL** : `https://VOTRE_PROJET.supabase.co/rest/v1/rpc/keepalive_ping`
   - **Cron Expression** : `0 0 */3 * *`
   - **HTTP Method** : `POST`
   - **HTTP Headers** : Ajouter `apikey` et `Content-Type`

### Option C : Netlify Functions (Si vous utilisez Netlify)

Créer une fonction Netlify qui s'exécute périodiquement :

```typescript
// netlify/functions/keepalive.ts
import { schedule } from '@netlify/functions'

const handler = schedule('0 0 */3 * *', async () => {
  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/keepalive_ping`,
    {
      method: 'POST',
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json'
      },
      body: '{}'
    }
  )
  
  const data = await response.json()
  console.log('Keep-alive ping:', data)
  
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  }
})

export { handler }
```

## 📊 Étape 4 : Vérifier que ça fonctionne

### Vérifier les pings dans Supabase

```sql
-- Voir les 10 derniers pings
SELECT * FROM public._keepalive 
ORDER BY pinged_at DESC 
LIMIT 10;
```

### Vérifier manuellement l'endpoint

Avec `curl` :

```bash
curl -X POST \
  'https://VOTRE_PROJET.supabase.co/rest/v1/rpc/keepalive_ping' \
  -H 'apikey: VOTRE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Avec Postman/Insomnia :
- **Method** : `POST`
- **URL** : `https://VOTRE_PROJET.supabase.co/rest/v1/rpc/keepalive_ping`
- **Headers** :
  - `apikey: VOTRE_ANON_KEY`
  - `Content-Type: application/json`
- **Body** : `{}`

## 🔍 Monitoring

### Vérifier le dernier ping

```sql
SELECT 
  pinged_at,
  NOW() - pinged_at AS time_since_last_ping,
  source
FROM public._keepalive
ORDER BY pinged_at DESC
LIMIT 1;
```

### Vérifier si le système est actif

```sql
-- Si le dernier ping date de plus de 4 jours, il y a un problème
SELECT 
  CASE 
    WHEN NOW() - MAX(pinged_at) > INTERVAL '4 days' 
    THEN '⚠️ ATTENTION : Pas de ping depuis plus de 4 jours !'
    ELSE '✅ Système keep-alive actif'
  END AS status,
  MAX(pinged_at) AS last_ping,
  NOW() - MAX(pinged_at) AS time_since_last_ping
FROM public._keepalive;
```

## 🧹 Maintenance

La table `_keepalive` se nettoie automatiquement et garde seulement les 100 derniers pings.

Pour nettoyer manuellement :

```sql
-- Supprimer tous les pings sauf les 50 derniers
DELETE FROM public._keepalive
WHERE id NOT IN (
  SELECT id FROM public._keepalive
  ORDER BY pinged_at DESC
  LIMIT 50
);
```

## ❓ FAQ

### Pourquoi tous les 3 jours ?
Supabase se met en pause après 7 jours d'inactivité. En pingant tous les 3 jours, on a une marge de sécurité confortable.

### Est-ce que c'est sécurisé ?
Oui, la fonction `keepalive_ping()` est publique mais elle ne fait qu'insérer une ligne dans une table technique. Aucune donnée sensible n'est exposée.

### Quel est l'impact sur les quotas Supabase ?
Minimal. Un ping tous les 3 jours = ~10 requêtes par mois. C'est négligeable par rapport aux quotas gratuits.

### Que se passe-t-il si le cron-job échoue ?
Supabase se mettra en pause après 7 jours. Il suffit de le réactiver manuellement et de vérifier la configuration du cron-job.

### Puis-je changer la fréquence ?
Oui, mais ne descendez pas en dessous de 6 jours pour garder une marge de sécurité.

## 🎯 Résumé

1. ✅ Exécuter `create_keepalive_system.sql` dans Supabase
2. ✅ Tester avec `SELECT public.keepalive_ping();`
3. ✅ Configurer un cron-job sur cron-job.org
4. ✅ Vérifier que les pings arrivent bien
5. ✅ Profiter d'un Supabase toujours actif ! 🎉

---

**Dernière mise à jour** : Janvier 2025
