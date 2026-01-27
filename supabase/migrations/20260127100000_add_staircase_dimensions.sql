-- Add dimension columns to staircases table for area-based tile calculations
-- Each step/riser can now have individual dimensions instead of just counts

ALTER TABLE public.staircases
ADD COLUMN IF NOT EXISTS step_length numeric,
ADD COLUMN IF NOT EXISTS step_width numeric,
ADD COLUMN IF NOT EXISTS riser_height numeric,
ADD COLUMN IF NOT EXISTS riser_width numeric,
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'mm';

-- Add comment explaining the columns
COMMENT ON COLUMN public.staircases.step_length IS 'Length of each step tread in specified unit';
COMMENT ON COLUMN public.staircases.step_width IS 'Width/depth of each step tread in specified unit';
COMMENT ON COLUMN public.staircases.riser_height IS 'Height of each riser in specified unit';
COMMENT ON COLUMN public.staircases.riser_width IS 'Width of each riser in specified unit';
COMMENT ON COLUMN public.staircases.unit IS 'Measurement unit: mm, inches, feet, or metre';
