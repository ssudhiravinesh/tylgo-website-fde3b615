-- Canvas Room Shape: Add grid-based drawing data to rooms
-- Purely additive migration — all columns nullable, no existing data touched.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS canvas_cells JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS canvas_edges JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS canvas_unit_ratio DOUBLE PRECISION DEFAULT NULL;

COMMENT ON COLUMN public.rooms.canvas_cells
  IS 'Grid cells painted by user: [{row: number, col: number}]';

COMMENT ON COLUMN public.rooms.canvas_edges
  IS 'Edge segments with measurements: [{id, cells, length, direction, startRow, startCol, endRow, endCol}]';

COMMENT ON COLUMN public.rooms.canvas_unit_ratio
  IS 'Real-world units per grid cell, locked after first measurement entry';
