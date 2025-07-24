-- Clean up and rebuild RLS policies for proper worker and admin access

-- Drop all existing RLS policies to start fresh
DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can create customers with self as attendee" ON public.customers;
DROP POLICY IF EXISTS "Workers can delete their assigned customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can update their assigned customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can view their assigned customers" ON public.customers;

DROP POLICY IF EXISTS "Admins can manage all quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins/workers can delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can create quotations for assigned customers" ON public.quotations;
DROP POLICY IF EXISTS "Workers can delete their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can update their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can view their own quotations" ON public.quotations;

DROP POLICY IF EXISTS "Admins can manage all quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Workers can manage items for their quotations" ON public.quotation_items;

DROP POLICY IF EXISTS "Admins can manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "Workers can manage rooms for assigned customers" ON public.rooms;

DROP POLICY IF EXISTS "Workers can manage tile selections for assigned customers" ON public.room_tile_selections;

DROP POLICY IF EXISTS "Admins can manage tiles" ON public.tiles;
DROP POLICY IF EXISTS "Everyone can view tiles" ON public.tiles;

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for new users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;

-- CUSTOMERS TABLE POLICIES
-- Workers can view all customers (needed for customer selection in quotations)
CREATE POLICY "Workers can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'worker'::user_role);

-- Workers can create customers and automatically become the attendee
CREATE POLICY "Workers can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND attended_by = auth.uid()
);

-- Workers can update customer information
CREATE POLICY "Workers can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'worker'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'worker'::user_role);

-- Workers can delete customers
CREATE POLICY "Workers can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'worker'::user_role);

-- Admins have full access to customers
CREATE POLICY "Admins have full access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- QUOTATIONS TABLE POLICIES
-- Workers can view their own quotations
CREATE POLICY "Workers can view their quotations"
ON public.quotations
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
);

-- Workers can create quotations
CREATE POLICY "Workers can create quotations"
ON public.quotations
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
);

-- Workers can update their own quotations
CREATE POLICY "Workers can update their quotations"
ON public.quotations
FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
)
WITH CHECK (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
);

-- Workers can delete their own quotations
CREATE POLICY "Workers can delete their quotations"
ON public.quotations
FOR DELETE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
);

-- Admins have full access to quotations
CREATE POLICY "Admins have full access to quotations"
ON public.quotations
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- QUOTATION ITEMS TABLE POLICIES
-- Workers can manage quotation items for their quotations
CREATE POLICY "Workers can manage their quotation items"
ON public.quotation_items
FOR ALL
TO authenticated
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND EXISTS (
    SELECT 1 FROM public.quotations 
    WHERE quotations.id = quotation_items.quotation_id 
    AND quotations.worker_id = auth.uid()
  )
)
WITH CHECK (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND EXISTS (
    SELECT 1 FROM public.quotations 
    WHERE quotations.id = quotation_items.quotation_id 
    AND quotations.worker_id = auth.uid()
  )
);

-- Admins have full access to quotation items
CREATE POLICY "Admins have full access to quotation items"
ON public.quotation_items
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- ROOMS TABLE POLICIES
-- Workers can manage all rooms (needed for quotations)
CREATE POLICY "Workers can manage all rooms"
ON public.rooms
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'worker'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'worker'::user_role);

-- Admins have full access to rooms
CREATE POLICY "Admins have full access to rooms"
ON public.rooms
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- ROOM TILE SELECTIONS TABLE POLICIES
-- Workers can manage all tile selections
CREATE POLICY "Workers can manage all tile selections"
ON public.room_tile_selections
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'worker'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'worker'::user_role);

-- Admins have full access to tile selections
CREATE POLICY "Admins have full access to tile selections"
ON public.room_tile_selections
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- TILES TABLE POLICIES
-- Everyone can view tiles (needed for catalog browsing)
CREATE POLICY "Everyone can view tiles"
ON public.tiles
FOR SELECT
TO authenticated
USING (true);

-- Workers can insert tiles
CREATE POLICY "Workers can insert tiles"
ON public.tiles
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'worker'::user_role);

-- Workers can update tiles
CREATE POLICY "Workers can update tiles"
ON public.tiles
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'worker'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'worker'::user_role);

-- Workers can delete tiles
CREATE POLICY "Workers can delete tiles"
ON public.tiles
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'worker'::user_role);

-- Admins have full access to tiles
CREATE POLICY "Admins have full access to tiles"
ON public.tiles
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- PROFILES TABLE POLICIES
-- Allow profile creation for new users
CREATE POLICY "Allow profile creation for new users" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Users can insert own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can view and update their own profiles
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Admins have full access to profiles
CREATE POLICY "Admins have full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- USER SESSIONS TABLE POLICIES
-- Users can manage their own sessions
CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);