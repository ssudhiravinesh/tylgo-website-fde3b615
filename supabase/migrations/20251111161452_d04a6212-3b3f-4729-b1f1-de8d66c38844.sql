-- Create quotation counter table with single row constraint
CREATE TABLE IF NOT EXISTS public.quotation_counter (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_number INTEGER NOT NULL DEFAULT 0,
  financial_year TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize counter with highest existing quotation number
INSERT INTO public.quotation_counter (id, current_number, financial_year)
VALUES (
  1,
  COALESCE(
    (
      SELECT MAX(CAST(SUBSTRING(quotation_number FROM '^[0-9]+') AS INTEGER))
      FROM quotations
      WHERE quotation_number SIMILAR TO '[0-9]+/[0-9]{4}-[0-9]{2}'
    ),
    0
  ),
  CASE 
    WHEN EXTRACT(MONTH FROM NOW()) >= 4 THEN
      EXTRACT(YEAR FROM NOW())::TEXT || '-' || SUBSTRING((EXTRACT(YEAR FROM NOW()) + 1)::TEXT FROM 3)
    ELSE
      (EXTRACT(YEAR FROM NOW()) - 1)::TEXT || '-' || SUBSTRING(EXTRACT(YEAR FROM NOW())::TEXT FROM 3)
  END
)
ON CONFLICT (id) DO NOTHING;

-- Create atomic function to get and increment quotation number
CREATE OR REPLACE FUNCTION public.get_next_quotation_number(fy TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  formatted_number TEXT;
  current_fy TEXT;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT current_number, financial_year INTO next_num, current_fy
  FROM public.quotation_counter
  WHERE id = 1
  FOR UPDATE;
  
  -- Reset counter if financial year changed
  IF current_fy != fy THEN
    next_num := 0;
  END IF;
  
  -- Increment counter
  next_num := next_num + 1;
  
  -- Update the counter atomically
  UPDATE public.quotation_counter
  SET 
    current_number = next_num,
    financial_year = fy,
    updated_at = NOW()
  WHERE id = 1;
  
  -- Format: 00001/2025-26
  formatted_number := LPAD(next_num::TEXT, 5, '0') || '/' || fy;
  
  RETURN formatted_number;
END;
$$;

-- Enable RLS on quotation_counter
ALTER TABLE public.quotation_counter ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the counter
CREATE POLICY "Authenticated users can read counter"
ON public.quotation_counter
FOR SELECT
TO authenticated
USING (true);

-- Only allow the function to update (via SECURITY DEFINER)
CREATE POLICY "Only function can update counter"
ON public.quotation_counter
FOR UPDATE
TO authenticated
USING (false);