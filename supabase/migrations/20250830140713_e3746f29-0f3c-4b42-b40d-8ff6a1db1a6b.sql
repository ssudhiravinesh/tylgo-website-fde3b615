-- Remove the dangerous policy that allows unrestricted profile creation
DROP POLICY IF EXISTS "Allow profile creation for new users" ON public.profiles;

-- Add a secure policy that only allows users to create their own profile with worker role
-- This prevents privilege escalation during signup
CREATE POLICY "Users can create own profile with worker role" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  AND role = 'worker'::user_role
);

-- Ensure the handle_new_user trigger function sets the correct default role
-- Update the function to enforce worker role for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'name', 
    'worker'::user_role  -- Force worker role for all new signups
  );
  RETURN NEW;
END;
$$;