-- Add columns to quotation_items for staircases support
ALTER TABLE public.quotation_items
ADD COLUMN IF NOT EXISTS staircase_id uuid REFERENCES public.staircases(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS quantity integer,
ADD COLUMN IF NOT EXISTS tile_type text;

-- Make room_id nullable since items can now belong to a staircase instead
ALTER TABLE public.quotation_items
ALTER COLUMN room_id DROP NOT NULL;
