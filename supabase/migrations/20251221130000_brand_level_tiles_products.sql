-- Migration: Add brand_id to tiles and products for brand-level sharing
-- Tiles and products will be shared across all showrooms within the same brand

-- Step 1: Add brand_id column to tiles table
ALTER TABLE public.tiles ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id);

-- Step 2: Add brand_id column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id);

-- Step 3: Populate brand_id from showroom's brand for existing tiles
UPDATE public.tiles t 
SET brand_id = s.brand_id 
FROM public.showrooms s 
WHERE t.showroom_id = s.id 
AND t.brand_id IS NULL;

-- Step 4: Populate brand_id from showroom's brand for existing products
UPDATE public.products p 
SET brand_id = s.brand_id 
FROM public.showrooms s 
WHERE p.showroom_id = s.id 
AND p.brand_id IS NULL;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tiles_brand_id ON public.tiles(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);

-- Step 6: Ensure Jayam Trader showroom is under ANUJ brand
UPDATE public.showrooms 
SET brand_id = (SELECT id FROM public.brands WHERE name = 'ANUJ' LIMIT 1)
WHERE name ILIKE '%jayam%' 
AND (SELECT id FROM public.brands WHERE name = 'ANUJ' LIMIT 1) IS NOT NULL;

-- Step 7: Ensure showroom2 is under ABCD brand
UPDATE public.showrooms 
SET brand_id = (SELECT id FROM public.brands WHERE name = 'ABCD' LIMIT 1)
WHERE name ILIKE '%showroom2%' 
AND (SELECT id FROM public.brands WHERE name = 'ABCD' LIMIT 1) IS NOT NULL;
