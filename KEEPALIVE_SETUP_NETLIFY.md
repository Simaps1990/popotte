# 🔄 Configuration Keep-Alive Supabase avec Netlify

Guide complet pour empêcher Supabase de se mettre en pause après 7 jours d'inactivité en utilisant une **Netlify Scheduled Function**.

---

## 📋 Étape 1 : Exécuter le script SQL dans Supabase

1. **Ouvrir le SQL Editor** dans Supabase Dashboard
2. **Copier-coller** le contenu de `supabase/migrations/create_keepalive_system.sql`
3. **Exécuter** le script
4. **Vérifier** le message de succès

---

## 🧪 Étape 2 : Tester la fonction RPC

Dans le SQL Editor de Supabase, exécuter :

```sql
SELECT public.keepalive_ping();
```

**Résultat attendu** :
```json
{
  "success": true,
  "ping_id": 2,
  "total_pings": 2,
  "pinged_at": "2025-01-09T...",
  "message": "Supabase keep-alive ping successful"
}
```

✅ Si vous voyez ce résultat, la fonction RPC fonctionne parfaitement !

---

## 🚀 Étape 3 : Installer les dépendances

Exécuter dans le terminal :

```bash
npm install
```

Cela installera `@netlify/functions` nécessaire pour les scheduled functions.

---

## 🌐 Étape 4 : Vérifier les variables d'environnement Netlify

Les variables suivantes doivent être configurées dans **Netlify Dashboard** :

**Site Settings → Environment Variables**

| Variable | Valeur | Où la trouver |
|----------|--------|---------------|
| `VITE_SUPABASE_URL` | URL de votre projet | Dashboard Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Clé publique | Dashboard Supabase → Settings → API → anon/public key |

⚠️ **Note** : Ces variables existent déjà pour votre application React. Aucune configuration supplémentaire n'est nécessaire.

---

## 📤 Étape 5 : Déployer sur Netlify

### Option A : Via Git (Recommandé)

1. **Commit** les changements :
   ```bash
   git add .
   git commit -m "feat: Add Netlify scheduled function for Supabase keep-alive"
   git push
   ```

2. **Netlify déploie automatiquement** :
   - La fonction sera détectée dans `netlify/functions/keepalive.mts`
   - Un cron job sera créé automatiquement
   - La fonction s'exécutera tous les 3 jours à minuit (UTC)

### Option B : Via Netlify CLI

```bash
netlify deploy --prod
```

---

## ✅ Étape 6 : Vérifier que la fonction est active

### Dans Netlify Dashboard

1. Aller dans **Functions** (menu de gauche)
2. Vérifier que `keepalive` apparaît dans la liste
3. Cliquer dessus pour voir les détails

### Vérifier la planification

La fonction devrait afficher :
- **Schedule** : `0 0 */3 * *`
- **Next execution** : Date du prochain ping

---

## 🧪 Étape 7 : Tester manuellement

### Test via curl

```bash
curl -X POST https://popote.netlify.app/.netlify/functions/keepalive
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Supabase keep-alive ping successful",
  "data": {
    "success": true,
    "ping_id": 3,
    "total_pings": 3,
    "pinged_at": "2025-01-09T12:00:00Z",
    "message": "Supabase keep-alive ping successful"
  },
  "timestamp": "2025-01-09T12:00:00.000Z"
}
```

### Vérifier dans Supabase

```sql
-- Voir les 10 derniers pings
SELECT * FROM public._keepalive 
ORDER BY pinged_at DESC 
LIMIT 10;
```

Vous devriez voir un nouveau ping avec `source = 'cron-job'`.

---

## 📊 Monitoring

### Voir les logs Netlify

1. **Netlify Dashboard** → **Functions** → `keepalive`
2. Cliquer sur **Function log**
3. Voir les exécutions réussies/échouées

**Log de succès attendu** :
```
✅ Supabase keep-alive ping réussi: {
  timestamp: '2025-01-09T00:00:00.000Z',
  pingId: 42,
  totalPings: 100,
  message: 'Supabase keep-alive ping successful'
}
```

### Vérifier le dernier ping dans Supabase

```sql
SELECT 
  pinged_at,
  NOW() - pinged_at AS time_since_last_ping,
  source,
  CASE 
    WHEN NOW() - pinged_at > INTERVAL '4 days' 
    THEN '⚠️ ATTENTION : Pas de ping depuis plus de 4 jours !'
    ELSE '✅ Système keep-alive actif'
  END AS status
FROM public._keepalive
ORDER BY pinged_at DESC
LIMIT 1;
```

---

## 📅 Planification

**Cron expression** : `0 0 */3 * *`

- **Fréquence** : Tous les 3 jours
- **Heure** : Minuit (00:00 UTC)
- **Exemples d'exécution** :
  - 1er janvier 00:00 UTC
  - 4 janvier 00:00 UTC
  - 7 janvier 00:00 UTC
  - 10 janvier 00:00 UTC
  - etc.

---

## 🔧 Dépannage

### ❌ La fonction n'apparaît pas dans Netlify

**Causes possibles** :
1. Le fichier n'est pas dans `netlify/functions/`
2. Le fichier n'a pas l'extension `.mts` ou `.ts`
3. Le build a échoué

**Solution** :
- Vérifier les logs de build dans Netlify
- Vérifier que `netlify.toml` contient la section `[functions]`

### ❌ Erreur "Cannot find module '@netlify/functions'"

**Cause** : La dépendance n'est pas installée

**Solution** :
```bash
npm install --save-dev @netlify/functions
git add package.json package-lock.json
git commit -m "chore: Add @netlify/functions dependency"
git push
```

### ❌ Erreur "Variables d'environnement manquantes"

**Cause** : `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` non définies

**Solution** :
1. Netlify Dashboard → Site Settings → Environment Variables
2. Ajouter les variables manquantes
3. Redéployer le site

### ❌ Erreur "Bucket not found" ou "Function not found"

**Cause** : Le script SQL n'a pas été exécuté dans Supabase

**Solution** :
- Exécuter `supabase/migrations/create_keepalive_system.sql` dans Supabase

### ❌ La fonction s'exécute mais échoue

**Diagnostic** :
1. Voir les logs dans Netlify Functions
2. Vérifier l'erreur exacte
3. Tester manuellement la fonction RPC dans Supabase

---

## 📈 Impact et coûts

| Métrique | Valeur |
|----------|--------|
| **Fréquence** | 1 ping tous les 3 jours |
| **Requêtes/mois** | ~10 requêtes |
| **Coût Netlify** | Gratuit (inclus dans le plan gratuit) |
| **Coût Supabase** | Négligeable (~10 requêtes/mois) |
| **Quota Netlify Functions** | 125 000 requêtes/mois (gratuit) |

✅ **Impact minimal, efficacité maximale !**

---

## ✅ Avantages de cette solution

1. ✅ **Aucun service externe** : Tout géré par Netlify
2. ✅ **100% gratuit** : Inclus dans le plan Netlify gratuit
3. ✅ **Fiable** : Infrastructure Netlify robuste
4. ✅ **Logs intégrés** : Monitoring facile
5. ✅ **Déploiement automatique** : Aucune configuration manuelle
6. ✅ **Sécurisé** : Variables d'environnement protégées

---

## 🎯 Résumé des étapes

1. ✅ Exécuter `create_keepalive_system.sql` dans Supabase
2. ✅ Tester avec `SELECT public.keepalive_ping();`
3. ✅ Installer les dépendances : `npm install`
4. ✅ Vérifier les variables d'environnement Netlify
5. ✅ Commit et push sur Git
6. ✅ Vérifier que la fonction est active dans Netlify
7. ✅ Tester manuellement
8. ✅ Profiter d'un Supabase toujours actif ! 🎉

---

**Dernière mise à jour** : Janvier 2025  
**Site** : https://popote.netlify.app/
