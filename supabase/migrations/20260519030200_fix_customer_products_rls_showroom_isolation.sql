-- =============================================
-- FIX customer_products RLS — ADD SHOWROOM ISOLATION
-- =============================================
-- The previous policies only checked auth.role() = 'authenticated',
-- meaning ANY authenticated user from ANY showroom could read/modify
-- customer product assignments from other showrooms.
-- =============================================

-- Drop the wide-open policies
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.customer_products;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.customer_products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.customer_products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.customer_products;

-- Create showroom-scoped policies
CREATE POLICY "Users can view showroom customer products"
ON public.customer_products FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can create showroom customer products"
ON public.customer_products FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);

CREATE POLICY "Users can update showroom customer products"
ON public.customer_products FOR UPDATE
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can delete showroom customer products"
ON public.customer_products FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND showroom_id = get_user_showroom_id(auth.uid())
);
