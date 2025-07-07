-- Update rooms table to properly support floor and wall room types
ALTER TABLE public.rooms 
ALTER COLUMN room_type SET DEFAULT 'floor';

-- Add comment to clarify room_type usage
COMMENT ON COLUMN public.rooms.room_type IS 'Type of room: floor or wall. Determines which dimensions are used for calculations.';

-- Add comment to clarify dimension usage
COMMENT ON COLUMN public.rooms.length IS 'For floor rooms: room length. For wall rooms: wall length.';
COMMENT ON COLUMN public.rooms.width IS 'For floor rooms: room width. Not used for wall rooms.';
COMMENT ON COLUMN public.rooms.wall_height IS 'For wall rooms: wall height. Not used for floor rooms.';
COMMENT ON COLUMN public.rooms.wall_length IS 'For wall rooms: wall length (duplicate of length for consistency). Not used for floor rooms.';