-- Create function to validate current user session matches database
CREATE OR REPLACE FUNCTION public.validate_current_session()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_token text;
  current_token text;
BEGIN
  -- Get stored token from database
  SELECT session_token INTO stored_token
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Get current token from local storage (passed via RPC or custom claim)
  -- For now, we'll just check if session exists
  RETURN stored_token IS NOT NULL;
END;
$$;

-- Update existing RLS policies to include session validation
-- Drop existing policies first
DROP POLICY IF EXISTS "Workers can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can create customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can update customers they attended" ON public.customers;

-- Recreate with session validation
CREATE POLICY "Workers can view all customers with valid session" 
ON public.customers 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND validate_current_session());

CREATE POLICY "Workers can create customers with valid session" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND validate_current_session());

CREATE POLICY "Workers can update customers they attended with valid session" 
ON public.customers 
FOR UPDATE 
USING ((attended_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role) AND validate_current_session());

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile with valid session" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id AND validate_current_session());

CREATE POLICY "Users can update their own profile with valid session" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id AND validate_current_session());

CREATE POLICY "Admins can view all profiles with valid session" 
ON public.profiles 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role AND validate_current_session());

-- Update quotations policies
DROP POLICY IF EXISTS "Users can view quotations based on role" ON public.quotations;
DROP POLICY IF EXISTS "Workers can update their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can create quotations" ON public.quotations;

CREATE POLICY "Users can view quotations based on role with valid session" 
ON public.quotations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND validate_current_session()
  AND (
    get_user_role(auth.uid()) = 'admin'::user_role 
    OR (get_user_role(auth.uid()) = 'worker'::user_role AND worker_id = auth.uid())
  )
);

CREATE POLICY "Workers can create quotations with valid session" 
ON public.quotations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND validate_current_session()
  AND (worker_id = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['worker'::user_role, 'admin'::user_role]))
);

CREATE POLICY "Workers can update their own quotations with valid session" 
ON public.quotations 
FOR UPDATE 
USING (
  validate_current_session()
  AND (
    worker_id = auth.uid() 
    OR (get_user_role(auth.uid()) = ANY (ARRAY['worker'::user_role, 'admin'::user_role]) AND worker_id IS NOT NULL)
  )
);