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

-- Créer l'utilisateur de test
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
  '00000000-0000-0000-0000-000000000002', 
  'authenticated', 
  'authenticated', 
  'thomas@example.com', 
  '$2a$10$8XJ6Z2qy8q5zZ8q5z8q5zO8XJ6Z2qy8q5z8q5z8q5z8q5z8q5z8q', 
  now(), 
  now(), 
  now(), 
  now(), 
  now(), 
  '{"provider": "email", "providers": ["email"]}', 
  '{"username": "thomas"}', 
  '', 
  '', 
  '', 
  ''
);

-- Créer le profil utilisateur de test
insert into public.profiles (id, username, role, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000002', 
  'thomas', 
  'user', 
  now(), 
  now()
);
