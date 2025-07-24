-- Check current RLS policies for customers and quotations tables
-- and ensure workers have proper permissions

-- First, let's check if the policies are working correctly by updating them

-- Update customer policies to ensure workers can properly manage customers
DROP POLICY IF EXISTS "Workers can create customers with self as attendee" ON customers;
DROP POLICY IF EXISTS "Workers can update their assigned customers" ON customers;
DROP POLICY IF EXISTS "Workers can delete their assigned customers" ON customers;
DROP POLICY IF EXISTS "Workers can view their assigned customers" ON customers;

-- Recreate customer policies with proper permissions
CREATE POLICY "Workers can create customers with self as attendee" 
ON customers 
FOR INSERT 
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'worker' AND attended_by = auth.uid()
);

CREATE POLICY "Workers can view their assigned customers" 
ON customers 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker' AND attended_by = auth.uid()
);

CREATE POLICY "Workers can update their assigned customers" 
ON customers 
FOR UPDATE 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker' AND attended_by = auth.uid()
);

CREATE POLICY "Workers can delete their assigned customers" 
ON customers 
FOR DELETE 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker' AND attended_by = auth.uid()
);

-- Update quotation policies to ensure workers can properly manage their quotations
DROP POLICY IF EXISTS "Workers can create quotations for assigned customers" ON quotations;
DROP POLICY IF EXISTS "Workers can view their own quotations" ON quotations;
DROP POLICY IF EXISTS "Workers can update their own quotations" ON quotations;
DROP POLICY IF EXISTS "Workers can delete their own quotations" ON quotations;
DROP POLICY IF EXISTS "Admins/workers can delete quotations" ON quotations;

-- Recreate quotation policies with proper permissions
CREATE POLICY "Workers can create quotations for assigned customers" 
ON quotations 
FOR INSERT 
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'worker' 
  AND worker_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM customers 
    WHERE customers.id = quotations.customer_id 
    AND customers.attended_by = auth.uid()
  )
);

CREATE POLICY "Workers can view their own quotations" 
ON quotations 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker' AND worker_id = auth.uid()
);

CREATE POLICY "Workers can update their own quotations" 
ON quotations 
FOR UPDATE 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker' AND worker_id = auth.uid()
);

CREATE POLICY "Workers can delete their own quotations" 
ON quotations 
FOR DELETE 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker' AND worker_id = auth.uid()
);

-- Admin policies remain the same
CREATE POLICY "Admins can manage all customers" 
ON customers 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all quotations" 
ON quotations 
FOR ALL 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');