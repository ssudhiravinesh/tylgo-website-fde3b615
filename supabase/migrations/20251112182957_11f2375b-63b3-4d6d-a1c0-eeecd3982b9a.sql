-- Add is_active column to tiles table for soft delete functionality
ALTER TABLE public.tiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set all existing tiles to active
UPDATE public.tiles SET is_active = true WHERE is_active IS NULL;

-- Add index for better query performance when filtering by is_active
CREATE INDEX IF NOT EXISTS idx_tiles_is_active ON public.tiles(is_active);