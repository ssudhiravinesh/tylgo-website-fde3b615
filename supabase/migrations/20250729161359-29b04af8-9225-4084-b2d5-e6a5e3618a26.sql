-- Add discount fields to quotations table
ALTER TABLE public.quotations 
ADD COLUMN discount_percentage numeric DEFAULT 0,
ADD COLUMN discount_amount numeric DEFAULT 0;