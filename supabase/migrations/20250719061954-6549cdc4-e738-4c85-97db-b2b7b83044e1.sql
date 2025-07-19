-- Revert admin user creation migration
-- Delete the admin user profile first (due to potential constraints)
DELETE FROM public.profiles 
WHERE email = 'gavaskar@gmail.com' AND role = 'admin';

-- Delete the admin user from auth.users
DELETE FROM auth.users 
WHERE email = 'gavaskar@gmail.com' AND id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';