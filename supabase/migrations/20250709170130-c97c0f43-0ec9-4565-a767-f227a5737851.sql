-- Update the default wastage percentage from 10 to 0
ALTER TABLE public.quotations ALTER COLUMN wastage_percentage SET DEFAULT 0;