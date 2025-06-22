
-- Remove height column from rooms table since it's not needed
ALTER TABLE public.rooms DROP COLUMN IF EXISTS height;

-- Add customer_id, length, width, and unit columns to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS length numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS width numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'metre' CHECK (unit IN ('metre', 'inches', 'mm'));

-- Create a table to store room-tile selections (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.room_tile_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) NOT NULL,
  room_id uuid REFERENCES public.rooms(id) NOT NULL,
  tile_id uuid REFERENCES public.tiles(id) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, tile_id)
);

-- Enable RLS on room_tile_selections
ALTER TABLE public.room_tile_selections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for room_tile_selections (allowing all operations for now since no auth is implemented)
CREATE POLICY "Allow all operations on room_tile_selections" ON public.room_tile_selections FOR ALL USING (true);

-- Also add RLS policies for rooms table
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on rooms" ON public.rooms FOR ALL USING (true);
