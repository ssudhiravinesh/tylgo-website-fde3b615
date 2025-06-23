
-- Update the check constraint on the rooms table to include 'feet' as a valid unit
ALTER TABLE public.rooms 
DROP CONSTRAINT IF EXISTS rooms_unit_check;

ALTER TABLE public.rooms 
ADD CONSTRAINT rooms_unit_check 
CHECK (unit IN ('metre', 'inches', 'mm', 'feet'));
