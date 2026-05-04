-- Migration: Unified Room Surfaces
-- Rooms are now single entities (e.g. "BATHROOM") with optional floor and wall surfaces.
-- Previously, room_type was 'floor' or 'wall' and each physical room required two DB rows.
-- Now, room_type is always 'room', with has_floor/has_wall flags to indicate which surfaces exist.

-- Step 1: Clean existing room data (fresh start as agreed)
-- Delete tile selections referencing rooms first (FK dependency)
DELETE FROM public.room_tile_selections;
-- Delete quotation items referencing rooms
DELETE FROM public.quotation_items WHERE room_id IS NOT NULL;
-- Delete all rooms
DELETE FROM public.rooms;

-- Step 2: Add unified surface columns
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS has_floor BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_wall BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wall_measurements JSONB DEFAULT NULL;

-- Step 3: Update room_type default to 'room'
ALTER TABLE public.rooms
  ALTER COLUMN room_type SET DEFAULT 'room';

-- Step 4: Add constraint ensuring at least one surface is enabled
ALTER TABLE public.rooms
  ADD CONSTRAINT room_has_at_least_one_surface
  CHECK (has_floor = true OR has_wall = true);

-- Step 5: Add comments for clarity
COMMENT ON COLUMN public.rooms.room_type IS 'Always "room" for unified rooms. Legacy values "floor"/"wall" are deprecated.';
COMMENT ON COLUMN public.rooms.has_floor IS 'Whether this room has a floor surface for tile selection.';
COMMENT ON COLUMN public.rooms.has_wall IS 'Whether this room has wall surfaces for tile selection.';
COMMENT ON COLUMN public.rooms.measurements IS 'JSON array of floor measurement shapes: [{id, length, width}]';
COMMENT ON COLUMN public.rooms.wall_measurements IS 'JSON array of wall measurement shapes: [{id, length, width}] where length=wall_length, width=wall_height';
