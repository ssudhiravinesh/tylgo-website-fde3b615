-- Update customers table to replace address with area, state, and pincode
-- First, add the new columns
ALTER TABLE public.customers 
ADD COLUMN area TEXT,
ADD COLUMN state TEXT,
ADD COLUMN pincode TEXT;

-- For existing data, we'll keep the address column for now and populate the new fields
-- In production, you might want to parse existing addresses to populate these fields

-- Add comment to clarify the change
COMMENT ON COLUMN public.customers.area IS 'Customer residing area/locality';
COMMENT ON COLUMN public.customers.state IS 'Customer state';
COMMENT ON COLUMN public.customers.pincode IS 'Customer pincode/postal code';

-- Make area and state required for new entries (we'll handle this in the application logic)
-- We're not making them NOT NULL immediately to handle existing data gracefully