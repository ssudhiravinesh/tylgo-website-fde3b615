
-- Drop all existing tables and their dependencies
DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.tiles CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop the user_role enum
DROP TYPE IF EXISTS user_role CASCADE;

-- Clean up any remaining policies (they should be dropped with tables)
-- This is just to ensure everything is clean
