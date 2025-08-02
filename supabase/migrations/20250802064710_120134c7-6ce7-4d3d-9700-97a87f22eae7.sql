-- Add discount fields to quotations table
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;