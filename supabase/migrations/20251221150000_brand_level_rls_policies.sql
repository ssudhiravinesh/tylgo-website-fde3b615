-- =============================================
-- BRAND-LEVEL RLS POLICIES FOR TILES AND PRODUCTS
-- =============================================
-- This migration updates RLS policies to enable:
-- 1. Brand-level access for tiles and products (shared across showrooms within same brand)
-- 2. Super admin bypass for full access
-- =============================================

-- Step 1: Create helper function to get user's brand_id
CREATE OR REPLACE FUNCTION public.get_user_brand_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.brand_id 
  FROM public.profiles p
  JOIN public.showrooms s ON p.showroom_id = s.id
  WHERE p.id = _user_id;
$$;

-- =============================================
-- TILES POLICIES: UPDATE TO BRAND-LEVEL
-- =============================================

-- Step 2: Drop existing showroom-level tile policies
DROP POLICY IF EXISTS "Users can view showroom tiles" ON public.tiles;
DROP POLICY IF EXISTS "Users can create showroom tiles" ON public.tiles;
DROP POLICY IF EXISTS "Users can update showroom tiles" ON public.tiles;
DROP POLICY IF EXISTS "Users can delete showroom tiles" ON public.tiles;
-- Also drop brand-level if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view brand tiles" ON public.tiles;
DROP POLICY IF EXISTS "Users can create brand tiles" ON public.tiles;
DROP POLICY IF EXISTS "Users can update brand tiles" ON public.tiles;
DROP POLICY IF EXISTS "Users can delete brand tiles" ON public.tiles;
DROP POLICY IF EXISTS "Super admins can view all tiles" ON public.tiles;
DROP POLICY IF EXISTS "Super admins can manage all tiles" ON public.tiles;

-- Step 3: Create brand-level tile policies
CREATE POLICY "Users can view brand tiles"
ON public.tiles FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND brand_id = get_user_brand_id(auth.uid())
);

CREATE POLICY "Users can create brand tiles"
ON public.tiles FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND brand_id = get_user_brand_id(auth.uid())
);

CREATE POLICY "Users can update brand tiles"
ON public.tiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND brand_id = get_user_brand_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND brand_id = get_user_brand_id(auth.uid()));

CREATE POLICY "Users can delete brand tiles"
ON public.tiles FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND brand_id = get_user_brand_id(auth.uid())
);

-- Step 4: Add super_admin bypass policies for tiles
CREATE POLICY "Super admins can view all tiles"
ON public.tiles FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admins can manage all tiles"
ON public.tiles FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- =============================================
-- PRODUCTS POLICIES: UPDATE TO BRAND-LEVEL
-- =============================================

-- Step 5: Drop existing showroom-level product policies (if any)
DROP POLICY IF EXISTS "Users can view showroom products" ON public.products;
DROP POLICY IF EXISTS "Users can create showroom products" ON public.products;
DROP POLICY IF EXISTS "Users can update showroom products" ON public.products;
DROP POLICY IF EXISTS "Users can delete showroom products" ON public.products;
-- Also drop brand-level if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view brand products" ON public.products;
DROP POLICY IF EXISTS "Users can create brand products" ON public.products;
DROP POLICY IF EXISTS "Users can update brand products" ON public.products;
DROP POLICY IF EXISTS "Users can delete brand products" ON public.products;
DROP POLICY IF EXISTS "Super admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Super admins can manage all products" ON public.products;

-- Step 6: Create brand-level product policies
CREATE POLICY "Users can view brand products"
ON public.products FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND brand_id = get_user_brand_id(auth.uid())
);

CREATE POLICY "Users can create brand products"
ON public.products FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND brand_id = get_user_brand_id(auth.uid())
);

CREATE POLICY "Users can update brand products"
ON public.products FOR UPDATE
USING (auth.uid() IS NOT NULL AND brand_id = get_user_brand_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND brand_id = get_user_brand_id(auth.uid()));

CREATE POLICY "Users can delete brand products"
ON public.products FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND brand_id = get_user_brand_id(auth.uid())
);

-- Step 7: Add super_admin bypass policies for products
CREATE POLICY "Super admins can view all products"
ON public.products FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admins can manage all products"
ON public.products FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
