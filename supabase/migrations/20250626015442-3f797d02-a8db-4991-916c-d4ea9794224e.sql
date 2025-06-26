
-- Add reference information columns to customers table
ALTER TABLE public.customers 
ADD COLUMN reference_name text,
ADD COLUMN reference_mobile_no text;
