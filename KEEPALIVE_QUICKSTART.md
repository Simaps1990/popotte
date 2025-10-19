# ⚡ Keep-Alive Supabase - Guide Rapide

## 🎯 Objectif
Empêcher Supabase de se mettre en pause après 7 jours d'inactivité en utilisant une fonction Netlify qui s'exécute automatiquement tous les 3 jours.

---

## ✅ Étapes à suivre (5 minutes)

### 1️⃣ Exécuter le script SQL dans Supabase

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier-coller le contenu de : `supabase/migrations/create_keepalive_system.sql`
3. Cliquer sur **Run**
4. Vérifier le message de succès

### 2️⃣ Tester la fonction RPC

Dans le SQL Editor, exécuter :
```sql
SELECT public.keepalive_ping();
```

Résultat attendu : `{"success": true, ...}`

### 3️⃣ Commit et push sur Git

```bash
git add .
git commit -m "feat: Add Netlify scheduled function for Supabase keep-alive"
git push
```

### 4️⃣ Vérifier le déploiement Netlify

1. Attendre que Netlify déploie (1-2 minutes)
2. Aller dans **Netlify Dashboard** → **Functions**
3. Vérifier que `keepalive` apparaît dans la liste

### 5️⃣ Tester manuellement

```bash
curl -X POST https://popote.netlify.app/.netlify/functions/keepalive
```

Ou dans Supabase SQL Editor :
```sql
SELECT * FROM public._keepalive ORDER BY pinged_at DESC LIMIT 5;
```

---

## 🎉 C'est terminé !

Votre Supabase ne se mettra **jamais** en pause !

- ✅ Ping automatique tous les 3 jours
- ✅ 100% gratuit (inclus dans Netlify)
- ✅ Aucune maintenance requise

---

## 📚 Documentation complète

- **Guide détaillé** : `KEEPALIVE_SETUP_NETLIFY.md`
- **Documentation technique** : `netlify/functions/README.md`
- **Script SQL** : `supabase/migrations/create_keepalive_system.sql`

---

## 🔍 Monitoring

**Vérifier le dernier ping** :
```sql
SELECT 
  pinged_at,
  NOW() - pinged_at AS time_since_last_ping,
  CASE 
    WHEN NOW() - pinged_at > INTERVAL '4 days' 
    THEN '⚠️ Problème détecté'
    ELSE '✅ Système actif'
  END AS status
FROM public._keepalive
ORDER BY pinged_at DESC
LIMIT 1;
```

**Voir les logs Netlify** :
- Netlify Dashboard → Functions → keepalive → Function log

---

**Site** : https://popote.netlify.app/  
**Fréquence** : Tous les 3 jours à minuit (UTC)  
**Cron** : `0 0 */3 * *`
