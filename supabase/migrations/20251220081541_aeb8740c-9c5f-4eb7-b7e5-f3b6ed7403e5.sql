-- Fix: Update RLS policies to allow admins to create quotations as well
-- Drop and recreate the workers create policy to also allow admins

-- First, drop the restrictive policy
DROP POLICY IF EXISTS "Workers can create quotations" ON quotations;

-- Create a new policy that allows both workers and admins to create quotations
CREATE POLICY "Workers and admins can create quotations" 
ON quotations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
  AND (
    -- Workers can create quotations with worker_id = their own id
    (has_role(auth.uid(), 'worker'::app_role) AND worker_id = auth.uid())
    OR
    -- Admins can create quotations (for any worker in their showroom)
    has_role(auth.uid(), 'admin'::app_role)
  )
);