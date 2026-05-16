-- Add skirting surface dimensions to rooms
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS has_skirting    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skirting_length NUMERIC,
  ADD COLUMN IF NOT EXISTS skirting_height NUMERIC;

-- Add tile_type discriminator to room_tile_selections ('floor' | 'skirting')
-- Wall layers are already identified by layer_number > 0 and keep tile_type = 'floor'
ALTER TABLE room_tile_selections
  ADD COLUMN IF NOT EXISTS tile_type TEXT NOT NULL DEFAULT 'floor';

-- Drop old constraint and add new one that includes tile_type
-- This allows same tile to appear as both floor and skirting for a room
ALTER TABLE room_tile_selections
  DROP CONSTRAINT IF EXISTS room_tile_selections_room_id_tile_id_layer_number_key;

ALTER TABLE room_tile_selections
  ADD CONSTRAINT room_tile_selections_room_tile_layer_type_key
  UNIQUE (room_id, tile_id, layer_number, tile_type);
