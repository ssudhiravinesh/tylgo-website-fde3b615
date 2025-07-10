-- Add layer_number column to quotation_items table
ALTER TABLE public.quotation_items 
ADD COLUMN IF NOT EXISTS layer_number integer;