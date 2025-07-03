
-- Add unique constraint for room_tile_selections to support upsert operations
ALTER TABLE public.room_tile_selections 
DROP CONSTRAINT IF EXISTS room_tile_selections_room_id_tile_id_key;

-- Add proper unique constraint that matches the ON CONFLICT specification
ALTER TABLE public.room_tile_selections 
ADD CONSTRAINT room_tile_selections_unique_selection 
UNIQUE (room_id, tile_id, layer_number);

-- Also add an index for better performance
CREATE INDEX IF NOT EXISTS idx_room_tile_selections_lookup 
ON public.room_tile_selections (customer_id, room_id, tile_id, layer_number);
