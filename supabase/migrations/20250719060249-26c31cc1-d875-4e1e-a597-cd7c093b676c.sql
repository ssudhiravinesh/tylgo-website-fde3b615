-- Create admin user gavaskar with admin role
-- This will create both the auth user and profile record

-- First, we'll insert into auth.users (this requires service role privileges)
-- Note: In production, this should be done through the admin API or edge function

-- Insert the profile record for the admin user
-- We'll use a UUID that we'll set for the admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  'ed8a5481-f767-4750-a441-abb19b56937b'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'gavaskar@gmail.com',
  crypt('123456789', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "gavaskar", "role": "admin"}',
  false,
  'authenticated'
);

-- Insert the corresponding profile record
INSERT INTO public.profiles (
  id,
  name,
  email,
  role,
  created_at,
  updated_at
) VALUES (
  'ed8a5481-f767-4750-a441-abb19b56937b'::uuid,
  'gavaskar',
  'gavaskar@gmail.com',
  'admin',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;