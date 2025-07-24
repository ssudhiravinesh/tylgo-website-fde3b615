-- Add category column to tiles table
ALTER TABLE public.tiles 
ADD COLUMN category text;

-- Create index for better performance on category queries
CREATE INDEX idx_tiles_category ON public.tiles(category);

-- Update existing tiles to have a default category if needed
UPDATE public.tiles 
SET category = 'General' 
WHERE category IS NULL;