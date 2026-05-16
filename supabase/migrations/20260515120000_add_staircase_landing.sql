-- Add landing area fields to staircases table
-- Landing = the flat platform between stair flights, uses the same tile as steps
ALTER TABLE staircases
  ADD COLUMN IF NOT EXISTS landing_length NUMERIC,
  ADD COLUMN IF NOT EXISTS landing_width  NUMERIC;
