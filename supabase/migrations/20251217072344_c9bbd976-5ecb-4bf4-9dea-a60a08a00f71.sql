-- =============================================
-- MULTI-TENANT MIGRATION
-- =============================================

-- 1. Create showrooms table
CREATE TABLE public.showrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on showrooms
ALTER TABLE public.showrooms ENABLE ROW LEVEL SECURITY;

-- 2. Insert the initial showroom (Jayam Traders)
INSERT INTO public.showrooms (id, name, subdomain)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jayam Traders', 'anuj');

-- 3. Add showroom_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN showroom_id UUID REFERENCES public.showrooms(id);

-- 4. Add showroom_id to customers table
ALTER TABLE public.customers 
ADD COLUMN showroom_id UUID REFERENCES public.showrooms(id);

-- 5. Add showroom_id to tiles table
ALTER TABLE public.tiles 
ADD COLUMN showroom_id UUID REFERENCES public.showrooms(id);

-- 6. Add showroom_id to quotations table
ALTER TABLE public.quotations 
ADD COLUMN showroom_id UUID REFERENCES public.showrooms(id);

-- 7. Add showroom_id to quotation_items table
ALTER TABLE public.quotation_items 
ADD COLUMN showroom_id UUID REFERENCES public.showrooms(id);

-- 8. Add showroom_id to rooms table
ALTER TABLE public.rooms 
ADD COLUMN showroom_id UUID REFERENCES public.showrooms(id);

-- 9. Add showroom_id to room_tile_selections table
ALTER TABLE public.room_tile_selections 
ADD COLUMN showroom_id UUID REFERENCES public.showrooms(id);

-- =============================================
-- MIGRATE EXISTING DATA TO JAYAM TRADERS
-- =============================================

-- Update all existing profiles
UPDATE public.profiles 
SET showroom_id = '00000000-0000-0000-0000-000000000001'
WHERE showroom_id IS NULL;

-- Update all existing customers
UPDATE public.customers 
SET showroom_id = '00000000-0000-0000-0000-000000000001'
WHERE showroom_id IS NULL;

-- Update all existing tiles
UPDATE public.tiles 
SET showroom_id = '00000000-0000-0000-0000-000000000001'
WHERE showroom_id IS NULL;

-- Update all existing quotations
UPDATE public.quotations 
SET showroom_id = '00000000-0000-0000-0000-000000000001'
WHERE showroom_id IS NULL;

-- Update all existing quotation_items
UPDATE public.quotation_items 
SET showroom_id = '00000000-0000-0000-0000-000000000001'
WHERE showroom_id IS NULL;

-- Update all existing rooms
UPDATE public.rooms 
SET showroom_id = '00000000-0000-0000-0000-000000000001'
WHERE showroom_id IS NULL;

-- Update all existing room_tile_selections
UPDATE public.room_tile_selections 
SET showroom_id = '00000000-0000-0000-0000-000000000001'
WHERE showroom_id IS NULL;

-- =============================================
-- HELPER FUNCTION FOR SHOWROOM ACCESS
-- =============================================

-- Create function to get user's showroom_id
CREATE OR REPLACE FUNCTION public.get_user_showroom_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT showroom_id FROM public.profiles WHERE id = _user_id;
$$;

-- =============================================
-- UPDATE RLS POLICIES
-- =============================================

-- SHOWROOMS POLICIES
CREATE POLICY "Users can view their showroom"
ON public.showrooms
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND id = get_user_showroom_id(auth.uid())
);

-- PROFILES POLICIES (drop existing and recreate with showroom scope)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Admins can view showroom profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin') 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Admins can manage showroom profiles"
ON public.profiles
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin') 
  AND showroom_id = get_user_showroom_id(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin') 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

-- CUSTOMERS POLICIES (drop existing and recreate with showroom scope)
DROP POLICY IF EXISTS "Admins have full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can create customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Workers can view all customers" ON public.customers;

CREATE POLICY "Users can view showroom customers"
ON public.customers
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can create showroom customers"
ON public.customers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can update showroom customers"
ON public.customers
FOR UPDATE
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can delete showroom customers"
ON public.customers
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

-- TILES POLICIES (drop existing and recreate with showroom scope)
DROP POLICY IF EXISTS "Admins have full access to tiles" ON public.tiles;
DROP POLICY IF EXISTS "Authenticated users can view tiles" ON public.tiles;
DROP POLICY IF EXISTS "Workers can delete tiles" ON public.tiles;
DROP POLICY IF EXISTS "Workers can insert tiles" ON public.tiles;
DROP POLICY IF EXISTS "Workers can update tiles" ON public.tiles;

CREATE POLICY "Users can view showroom tiles"
ON public.tiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can create showroom tiles"
ON public.tiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can update showroom tiles"
ON public.tiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can delete showroom tiles"
ON public.tiles
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

-- QUOTATIONS POLICIES (drop existing and recreate with showroom scope)
DROP POLICY IF EXISTS "Admins have full access to quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins/workers can delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can create quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can delete their quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can update their quotations" ON public.quotations;
DROP POLICY IF EXISTS "Workers can view their quotations" ON public.quotations;

CREATE POLICY "Admins can view showroom quotations"
ON public.quotations
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin')
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Admins can manage showroom quotations"
ON public.quotations
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin')
  AND showroom_id = get_user_showroom_id(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin')
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Workers can view their quotations"
ON public.quotations
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker')
  AND worker_id = auth.uid()
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Workers can create quotations"
ON public.quotations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker')
  AND worker_id = auth.uid()
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Workers can update their quotations"
ON public.quotations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker')
  AND worker_id = auth.uid()
  AND showroom_id = get_user_showroom_id(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker')
  AND worker_id = auth.uid()
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Workers can delete their quotations"
ON public.quotations
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker')
  AND worker_id = auth.uid()
  AND showroom_id = get_user_showroom_id(auth.uid())
);

-- QUOTATION_ITEMS POLICIES (drop existing and recreate with showroom scope)
DROP POLICY IF EXISTS "Admins have full access to quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Workers can manage their quotation items" ON public.quotation_items;

CREATE POLICY "Admins can manage showroom quotation items"
ON public.quotation_items
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin')
  AND showroom_id = get_user_showroom_id(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin')
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Workers can manage their quotation items"
ON public.quotation_items
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker')
  AND showroom_id = get_user_showroom_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM quotations 
    WHERE quotations.id = quotation_items.quotation_id 
    AND quotations.worker_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'worker')
  AND showroom_id = get_user_showroom_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM quotations 
    WHERE quotations.id = quotation_items.quotation_id 
    AND quotations.worker_id = auth.uid()
  )
);

-- ROOMS POLICIES (drop existing and recreate with showroom scope)
DROP POLICY IF EXISTS "Admins have full access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Workers can manage all rooms" ON public.rooms;

CREATE POLICY "Users can view showroom rooms"
ON public.rooms
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can create showroom rooms"
ON public.rooms
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can update showroom rooms"
ON public.rooms
FOR UPDATE
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can delete showroom rooms"
ON public.rooms
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

-- ROOM_TILE_SELECTIONS POLICIES (drop existing and recreate with showroom scope)
DROP POLICY IF EXISTS "Admins have full access to tile selections" ON public.room_tile_selections;
DROP POLICY IF EXISTS "Workers can manage all tile selections" ON public.room_tile_selections;

CREATE POLICY "Users can view showroom tile selections"
ON public.room_tile_selections
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can create showroom tile selections"
ON public.room_tile_selections
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can update showroom tile selections"
ON public.room_tile_selections
FOR UPDATE
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can delete showroom tile selections"
ON public.room_tile_selections
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

-- =============================================
-- UPDATE HANDLE_NEW_USER FUNCTION
-- =============================================

-- Update the handle_new_user function to include showroom_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with showroom_id from metadata
  INSERT INTO public.profiles (id, email, name, role, showroom_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'name', 
    'worker'::user_role,
    (NEW.raw_user_meta_data->>'showroom_id')::uuid
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'worker'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;