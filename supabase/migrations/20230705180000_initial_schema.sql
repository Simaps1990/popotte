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
to authenticated
using (auth.uid() = id);

create policy "Les administrateurs peuvent voir tous les profils"
on public.profiles for select
to authenticated
using (exists (
  select 1 from public.profiles
  where id = auth.uid() and role = 'admin'
));

create policy "Les utilisateurs peuvent créer leur propre profil"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Les utilisateurs peuvent mettre à jour leur propre profil"
on public.profiles for update
to authenticated
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

-- Fonction pour obtenir le rôle de l'utilisateur actuel
create or replace function public.get_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer;

-- Fonction pour vérifier si l'utilisateur est admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;
