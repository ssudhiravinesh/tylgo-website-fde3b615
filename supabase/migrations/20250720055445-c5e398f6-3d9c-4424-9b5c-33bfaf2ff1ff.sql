-- Add category column to customers table
ALTER TABLE public.customers 
ADD COLUMN category text DEFAULT 'Customer' CHECK (category IN ('Customer', 'Builder', 'Engineer', 'Layer', 'Architect', 'Contractor'));

-- Create index for better performance on category filtering
CREATE INDEX idx_customers_category ON public.customers(category);

-- Create function to handle single session per user
CREATE OR REPLACE FUNCTION handle_single_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This trigger will be used to track user sessions
  -- The actual session management will be handled in the application
  RETURN NEW;
END;
$$;