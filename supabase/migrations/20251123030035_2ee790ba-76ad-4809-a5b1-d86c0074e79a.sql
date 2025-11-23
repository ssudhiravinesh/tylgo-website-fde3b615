-- ============================================
-- CRITICAL SECURITY FIX: Proper Role Architecture
-- ============================================
-- This migration fixes the critical privilege escalation vulnerability
-- by moving roles to a separate table with proper security

-- Step 1: Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'worker');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create user_roles table with strict security
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Step 3: Enable RLS on user_roles (CRITICAL - no user can modify their own roles)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create strict RLS policies - NO direct user access
-- Only service role can modify roles, users can only view their own
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- No INSERT, UPDATE, or DELETE policies for regular users
-- Roles are managed only via service role (admin functions)

-- Step 5: Create security definer function to check roles
-- This bypasses RLS to safely check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 6: Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, role::text::public.app_role, created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 7: Update all RLS policies to use has_role() and add explicit auth checks

-- CUSTOMERS TABLE
DROP POLICY IF EXISTS "Workers can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can create customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Admins have full access to customers" ON public.customers;

CREATE POLICY "Workers can view all customers" ON public.customers
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Workers can create customers" ON public.customers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND 
    attended_by = auth.uid()
  );

CREATE POLICY "Workers can update customers" ON public.customers
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Workers can delete customers" ON public.customers
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Admins have full access to customers" ON public.customers
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile with worker role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- QUOTATIONS TABLE
DROP POLICY IF EXISTS "Workers can view their quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can create quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can update their quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can delete their quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins/workers can delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins have full access to quotations" ON public.quotations;

CREATE POLICY "Workers can view their quotations" ON public.quotations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND 
    worker_id = auth.uid()
  );

CREATE POLICY "Workers can create quotations" ON public.quotations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND 
    worker_id = auth.uid()
  );

CREATE POLICY "Workers can update their quotations" ON public.quotations
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND 
    worker_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND 
    worker_id = auth.uid()
  );

CREATE POLICY "Workers can delete their quotations" ON public.quotations
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND 
    worker_id = auth.uid()
  );

CREATE POLICY "Admins have full access to quotations" ON public.quotations
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- QUOTATION_ITEMS TABLE
DROP POLICY IF EXISTS "Workers can manage their quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Admins have full access to quotation items" ON public.quotation_items;

CREATE POLICY "Workers can manage their quotation items" ON public.quotation_items
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND
    EXISTS (
      SELECT 1 FROM quotations 
      WHERE quotations.id = quotation_items.quotation_id 
        AND quotations.worker_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    public.has_role(auth.uid(), 'worker'::public.app_role) AND
    EXISTS (
      SELECT 1 FROM quotations 
      WHERE quotations.id = quotation_items.quotation_id 
        AND quotations.worker_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to quotation items" ON public.quotation_items
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- QUOTATION_COUNTER TABLE - Restrict to workers and admins only
DROP POLICY IF EXISTS "Authenticated users can read counter" ON public.quotation_counter;

CREATE POLICY "Workers and admins can read counter" ON public.quotation_counter
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'worker'::public.app_role) OR
      public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- TILES TABLE - Restrict to authenticated users (change from public access)
DROP POLICY IF EXISTS "Everyone can view tiles" ON public.tiles;
DROP POLICY IF EXISTS "Workers can insert tiles" ON public.tiles;
DROP POLICY IF EXISTS "Workers can update tiles" ON public.tiles;
DROP POLICY IF EXISTS "Workers can delete tiles" ON public.tiles;
DROP POLICY IF EXISTS "Admins have full access to tiles" ON public.tiles;

CREATE POLICY "Authenticated users can view tiles" ON public.tiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can insert tiles" ON public.tiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Workers can update tiles" ON public.tiles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Workers can delete tiles" ON public.tiles
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Admins have full access to tiles" ON public.tiles
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ROOMS TABLE
DROP POLICY IF EXISTS "Workers can manage all rooms" ON public.rooms;
DROP POLICY IF EXISTS "Admins have full access to rooms" ON public.rooms;

CREATE POLICY "Workers can manage all rooms" ON public.rooms
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Admins have full access to rooms" ON public.rooms
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ROOM_TILE_SELECTIONS TABLE
DROP POLICY IF EXISTS "Workers can manage all tile selections" ON public.room_tile_selections;
DROP POLICY IF EXISTS "Admins have full access to tile selections" ON public.room_tile_selections;

CREATE POLICY "Workers can manage all tile selections" ON public.room_tile_selections
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'worker'::public.app_role));

CREATE POLICY "Admins have full access to tile selections" ON public.room_tile_selections
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Step 8: Update edge functions to use new has_role function
-- Note: Edge functions will need to check user_roles table directly using service role

-- Step 9: Update handle_new_user trigger to use user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'name', 
    'worker'::user_role
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'worker'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 10: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Step 11: Add comments for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user roles separately from profiles for security. Users cannot modify their own roles.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to safely check user roles without RLS recursion issues.';