-- Security Fix Migration: Implement Proper RLS Policies
-- This migration addresses critical security vulnerabilities by replacing permissive policies

-- 1. Fix CUSTOMERS table - Add missing RLS policies
-- Drop existing overly permissive policy if exists
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

-- Customers: Admins can do everything
CREATE POLICY "Admins can manage all customers" 
ON public.customers 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Customers: Workers can view customers they're assigned to
CREATE POLICY "Workers can view their assigned customers" 
ON public.customers 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND attended_by = auth.uid()
);

-- Customers: Workers can create customers with themselves as attendee
CREATE POLICY "Workers can create customers with self as attendee" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND attended_by = auth.uid()
);

-- Customers: Workers can update customers they're assigned to
CREATE POLICY "Workers can update their assigned customers" 
ON public.customers 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND attended_by = auth.uid()
);

-- Customers: Workers can delete customers they're assigned to
CREATE POLICY "Workers can delete their assigned customers" 
ON public.customers 
FOR DELETE 
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND attended_by = auth.uid()
);

-- 2. Fix QUOTATIONS table - Replace dangerous true policies
-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Users can create quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can view quotations" ON public.quotations;

-- Quotations: Admins can do everything
CREATE POLICY "Admins can manage all quotations" 
ON public.quotations 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Quotations: Workers can view their own quotations
CREATE POLICY "Workers can view their own quotations" 
ON public.quotations 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
);

-- Quotations: Workers can create quotations for their assigned customers
CREATE POLICY "Workers can create quotations for assigned customers" 
ON public.quotations 
FOR INSERT 
WITH CHECK (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.customers 
    WHERE id = customer_id AND attended_by = auth.uid()
  )
);

-- Quotations: Workers can update their own quotations
CREATE POLICY "Workers can update their own quotations" 
ON public.quotations 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
);

-- Quotations: Workers can delete their own quotations
CREATE POLICY "Workers can delete their own quotations" 
ON public.quotations 
FOR DELETE 
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND worker_id = auth.uid()
);

-- 3. Fix ROOMS table - Replace dangerous true policies
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on rooms" ON public.rooms;
DROP POLICY IF EXISTS "Everyone can view rooms" ON public.rooms;

-- Rooms: Workers can manage rooms for their assigned customers
CREATE POLICY "Workers can manage rooms for assigned customers" 
ON public.rooms 
FOR ALL 
USING (
  (get_user_role(auth.uid()) = 'worker'::user_role 
   AND EXISTS (
     SELECT 1 FROM public.customers 
     WHERE id = customer_id AND attended_by = auth.uid()
   ))
  OR get_user_role(auth.uid()) = 'admin'::user_role
);

-- 4. Fix ROOM_TILE_SELECTIONS table - Replace dangerous true policies
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on room_tile_selections" ON public.room_tile_selections;

-- Room tile selections: Workers can manage selections for their assigned customers
CREATE POLICY "Workers can manage tile selections for assigned customers" 
ON public.room_tile_selections 
FOR ALL 
USING (
  (get_user_role(auth.uid()) = 'worker'::user_role 
   AND EXISTS (
     SELECT 1 FROM public.customers 
     WHERE id = customer_id AND attended_by = auth.uid()
   ))
  OR get_user_role(auth.uid()) = 'admin'::user_role
);

-- 5. Update QUOTATION_ITEMS policies to align with quotation access
-- Drop existing policies to recreate with proper access control
DROP POLICY IF EXISTS "Users can manage quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can view quotation items based on quotation access" ON public.quotation_items;

-- Quotation items: Admins can do everything
CREATE POLICY "Admins can manage all quotation items" 
ON public.quotation_items 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Quotation items: Workers can manage items for their own quotations
CREATE POLICY "Workers can manage items for their quotations" 
ON public.quotation_items 
FOR ALL 
USING (
  get_user_role(auth.uid()) = 'worker'::user_role 
  AND EXISTS (
    SELECT 1 FROM public.quotations 
    WHERE id = quotation_id AND worker_id = auth.uid()
  )
);

-- 6. Ensure consistent foreign key constraints for data integrity
-- Add constraint to ensure quotations can only reference valid customers
ALTER TABLE public.quotations 
ADD CONSTRAINT fk_quotations_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id) 
ON DELETE CASCADE;

-- Add constraint to ensure quotation items reference valid quotations
ALTER TABLE public.quotation_items 
ADD CONSTRAINT fk_quotation_items_quotation 
FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) 
ON DELETE CASCADE;

-- Add constraint to ensure quotation items reference valid rooms
ALTER TABLE public.quotation_items 
ADD CONSTRAINT fk_quotation_items_room 
FOREIGN KEY (room_id) REFERENCES public.rooms(id) 
ON DELETE CASCADE;

-- Add constraint to ensure quotation items reference valid tiles
ALTER TABLE public.quotation_items 
ADD CONSTRAINT fk_quotation_items_tile 
FOREIGN KEY (tile_id) REFERENCES public.tiles(id) 
ON DELETE CASCADE;

-- Add constraint to ensure rooms reference valid customers
ALTER TABLE public.rooms 
ADD CONSTRAINT fk_rooms_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id) 
ON DELETE CASCADE;

-- Add constraint to ensure room tile selections reference valid customers
ALTER TABLE public.room_tile_selections 
ADD CONSTRAINT fk_room_tile_selections_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id) 
ON DELETE CASCADE;

-- Add constraint to ensure room tile selections reference valid rooms
ALTER TABLE public.room_tile_selections 
ADD CONSTRAINT fk_room_tile_selections_room 
FOREIGN KEY (room_id) REFERENCES public.rooms(id) 
ON DELETE CASCADE;

-- Add constraint to ensure room tile selections reference valid tiles
ALTER TABLE public.room_tile_selections 
ADD CONSTRAINT fk_room_tile_selections_tile 
FOREIGN KEY (tile_id) REFERENCES public.tiles(id) 
ON DELETE CASCADE;