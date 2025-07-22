# Configuration de Supabase pour Popotte

Ce guide vous explique comment configurer Supabase pour l'application Popotte.

## 1. Créer un projet Supabase

1. Allez sur [Supabase](https://supabase.com/) et connectez-vous ou créez un compte
2. Créez un nouveau projet
3. Notez l'URL du projet et la clé d'API anonyme (anon key)

## 2. Configurer la base de données

1. Allez dans l'éditeur SQL de Supabase
2. Exécutez le script SQL suivant pour créer les tables nécessaires :

```sql
-- Activez les extensions nécessaires
create extension if not exists "uuid-ossp";

-- Table des profils utilisateurs
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activer RLS sur la table profiles
alter table public.profiles enable row level security;

-- Politiques d'accès pour les profils
create policy "Les utilisateurs peuvent voir leur propre profil"
on public.profiles for select
using (auth.uid() = id);

create policy "Les administrateurs peuvent voir tous les profils"
on public.profiles for select
to authenticated
using (exists (
  select 1 from public.profiles
  where id = auth.uid() and role = 'admin'
));

create policy "Les utilisateurs peuvent mettre à jour leur propre profil"
on public.profiles for update
using (auth.uid() = id);

-- Fonction pour gérer la création d'un profil après inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    case when new.email = 'admin@popotte.fr' then 'admin' else 'user' end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Déclencher la création d'un profil après l'inscription
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 3. Configurer l'authentification

1. Allez dans l'onglet "Authentication" de Supabase
2. Activez l'authentification par email/mot de passe
3. Désactivez la confirmation d'email pour le développement (optionnel)
4. Ajoutez l'URL de redirection après connexion : `http://localhost:3000`
5. Ajoutez l'URL de redirection après déconnexion : `http://localhost:3000/auth`

## 4. Créer l'utilisateur administrateur

Exécutez ce script SQL dans l'éditeur SQL pour créer un utilisateur administrateur :

```sql
-- Créer l'utilisateur admin
insert into auth.users (
  instance_id, 
  id, 
  aud, 
  role, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  recovery_sent_at, 
  last_sign_in_at, 
  created_at, 
  updated_at, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  confirmation_token, 
  email_change, 
  email_change_token_new, 
  recovery_token
) 
values (
  '00000000-0000-0000-0000-000000000000', 
  '00000000-0000-0000-0000-000000000001', 
  'authenticated', 
  'authenticated', 
  'admin@popotte.fr', 
  '$2a$10$8XJ6Z2qy8q5zZ8q5z8q5zO8XJ6Z2qy8q5z8q5z8q5z8q5z8q5z8q', 
  now(), 
  now(), 
  now(), 
  now(), 
  now(), 
  '{"provider": "email", "providers": ["email"]}', 
  '{"username": "popotteadmin"}', 
  '', 
  '', 
  '', 
  ''
);

-- Créer le profil admin
insert into public.profiles (id, username, role, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000001', 
  'popotteadmin', 
  'admin', 
  now(), 
  now()
);
```

## 5. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec les informations suivantes :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

## 6. Démarrer l'application

```bash
npm install
npm run dev
```

## 7. Accès aux comptes

- **Administrateur** :
  - Email : admin@popotte.fr
  - Mot de passe : popotteGIGN78!
  - Identifiant : popotteadmin

- **Utilisateur de test** :
  - Email : thomas@example.com
  - Mot de passe : thomas
  - Identifiant : thomas

## 8. Sécurité

En production, assurez-vous de :
1. Activer la confirmation d'email
2. Configurer correctement les politiques RLS
3. Utiliser HTTPS
4. Mettre à jour régulièrement les dépendances
5. Configurer un nom de domaine personnalisé pour Supabase
