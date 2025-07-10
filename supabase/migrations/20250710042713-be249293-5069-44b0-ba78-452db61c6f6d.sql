-- Fix RLS policies for admin functions to work properly

-- First, let's ensure admins can insert profiles for new workers
DROP POLICY IF EXISTS "Allow profile creation for new users" ON public.profiles;
CREATE POLICY "Allow profile creation for new users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Ensure the quotations RLS policies allow role-based access correctly
-- Update the view policy to be more explicit about admin vs worker access
DROP POLICY IF EXISTS "Workers can view all quotations" ON public.quotations;
CREATE POLICY "Users can view quotations based on role" 
ON public.quotations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can see all quotations
    get_user_role(auth.uid()) = 'admin'::user_role OR
    -- Workers can only see their own quotations
    (get_user_role(auth.uid()) = 'worker'::user_role AND worker_id = auth.uid())
  )
);

-- Ensure quotation items have proper access control too
DROP POLICY IF EXISTS "Users can view quotation items" ON public.quotation_items;
CREATE POLICY "Users can view quotation items based on quotation access" 
ON public.quotation_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM quotations 
    WHERE quotations.id = quotation_items.quotation_id 
    AND (
      -- Admins can see all quotation items
      get_user_role(auth.uid()) = 'admin'::user_role OR
      -- Workers can only see items from their quotations
      (get_user_role(auth.uid()) = 'worker'::user_role AND quotations.worker_id = auth.uid())
    )
  )
);