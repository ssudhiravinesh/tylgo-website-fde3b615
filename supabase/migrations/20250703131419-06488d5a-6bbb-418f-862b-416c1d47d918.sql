
-- Add room_type column to rooms table to distinguish between wall and floor rooms
ALTER TABLE public.rooms 
ADD COLUMN room_type TEXT NOT NULL DEFAULT 'floor' CHECK (room_type IN ('floor', 'wall'));

-- Add layer_number column to room_tile_selections to support wall layers
ALTER TABLE public.room_tile_selections 
ADD COLUMN layer_number INTEGER DEFAULT NULL;

-- Add wall_height and wall_length columns to rooms table for wall calculations
ALTER TABLE public.rooms 
ADD COLUMN wall_height NUMERIC DEFAULT NULL,
ADD COLUMN wall_length NUMERIC DEFAULT NULL;
