-- Add product_id column to quotation_items table
ALTER TABLE public.quotation_items
ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
