
-- Add the new columns to the tiles table
ALTER TABLE public.tiles 
ADD COLUMN price_per_box numeric,
ADD COLUMN pieces_per_box integer;

-- Update the updated_at timestamp for existing records
UPDATE public.tiles 
SET updated_at = now() 
WHERE updated_at IS NOT NULL;
