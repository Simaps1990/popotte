# 🔄 Netlify Scheduled Function - Supabase Keep-Alive

## 📋 Description

Cette fonction Netlify s'exécute automatiquement **tous les 3 jours** pour empêcher votre base de données Supabase de se mettre en pause après 7 jours d'inactivité.

## ⚙️ Configuration

### 1. Exécuter le script SQL dans Supabase

Avant d'activer cette fonction, vous devez créer la table et la fonction RPC dans Supabase :

1. Ouvrir le **SQL Editor** dans Supabase Dashboard
2. Exécuter le script : `supabase/migrations/create_keepalive_system.sql`
3. Vérifier que tout fonctionne : `SELECT public.keepalive_ping();`

### 2. Variables d'environnement Netlify

Les variables suivantes doivent être configurées dans le **Dashboard Netlify** :

**Site Settings → Environment Variables**

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | Dashboard Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase | Dashboard Supabase → Settings → API → anon/public key |

⚠️ **Important** : Ces variables doivent déjà exister pour votre application React. Aucune configuration supplémentaire n'est nécessaire.

### 3. Déployer sur Netlify

Une fois le code poussé sur Git et déployé sur Netlify :

1. La fonction sera automatiquement détectée
2. Netlify créera un cron job automatique
3. La fonction s'exécutera tous les 3 jours à minuit (UTC)

## 📅 Planification

**Cron expression** : `0 0 */3 * *`

- **Fréquence** : Tous les 3 jours
- **Heure** : Minuit (00:00 UTC)
- **Exemple** : 
  - 1er janvier 00:00 UTC
  - 4 janvier 00:00 UTC
  - 7 janvier 00:00 UTC
  - etc.

## 🧪 Tester la fonction

### Test manuel via Netlify

1. Aller dans **Netlify Dashboard** → **Functions**
2. Cliquer sur `keepalive`
3. Cliquer sur **Trigger function** (si disponible)

### Test manuel via URL

```bash
curl -X POST https://popote.netlify.app/.netlify/functions/keepalive
```

### Vérifier les logs Netlify

1. **Netlify Dashboard** → **Functions** → `keepalive`
2. Voir les logs d'exécution
3. Vérifier les succès/erreurs

### Vérifier dans Supabase

```sql
-- Voir les 10 derniers pings
SELECT * FROM public._keepalive 
ORDER BY pinged_at DESC 
LIMIT 10;

-- Vérifier le dernier ping
SELECT 
  pinged_at,
  NOW() - pinged_at AS time_since_last_ping,
  source
FROM public._keepalive
ORDER BY pinged_at DESC
LIMIT 1;
```

## 📊 Monitoring

### Logs de succès attendus

```json
{
  "success": true,
  "message": "Supabase keep-alive ping successful",
  "data": {
    "success": true,
    "ping_id": 42,
    "total_pings": 100,
    "pinged_at": "2025-01-09T00:00:00Z",
    "message": "Supabase keep-alive ping successful"
  },
  "timestamp": "2025-01-09T00:00:00.000Z"
}
```

### Logs d'erreur

En cas d'erreur, vérifier :
1. Les variables d'environnement dans Netlify
2. Que le script SQL a bien été exécuté dans Supabase
3. Les logs Netlify pour plus de détails

## 🔧 Dépannage

### La fonction ne s'exécute pas

1. **Vérifier que la fonction est déployée** :
   - Netlify Dashboard → Functions
   - La fonction `keepalive` doit apparaître

2. **Vérifier les variables d'environnement** :
   - Site Settings → Environment Variables
   - `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` doivent être définies

3. **Vérifier les logs de build** :
   - Deploys → Dernière deploy → Function logs
   - Vérifier qu'il n'y a pas d'erreur de compilation

### Erreur "Bucket not found" ou "Function not found"

Le script SQL n'a pas été exécuté dans Supabase. Exécuter `create_keepalive_system.sql`.

### Erreur de variables d'environnement

Les variables `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` ne sont pas définies dans Netlify.

## 📈 Impact

- **Requêtes** : ~10 requêtes par mois (1 tous les 3 jours)
- **Coût** : Gratuit (inclus dans le plan Netlify gratuit)
- **Quotas Supabase** : Impact négligeable (~10 requêtes/mois)

## ✅ Avantages de cette solution

1. ✅ **Aucun service externe** : Tout est géré par Netlify
2. ✅ **Gratuit** : Inclus dans le plan gratuit Netlify
3. ✅ **Fiable** : Infrastructure Netlify robuste
4. ✅ **Logs intégrés** : Monitoring facile dans le dashboard
5. ✅ **Pas de configuration manuelle** : Déploiement automatique

## 🎯 Résultat

Votre base Supabase ne se mettra **jamais** en pause ! 🎉
