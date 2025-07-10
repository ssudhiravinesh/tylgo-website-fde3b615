-- First, add DELETE RLS policy for admins on profiles table
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin');

-- Make quotations.worker_id nullable so we can preserve quotations when worker is deleted
ALTER TABLE public.quotations 
ALTER COLUMN worker_id DROP NOT NULL;

-- Update the existing trigger function to handle the deletion properly
CREATE OR REPLACE FUNCTION handle_worker_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quotations to set worker_id to null when worker is deleted
  -- but keep the quotations accessible to admins
  UPDATE quotations 
  SET worker_id = NULL 
  WHERE worker_id = OLD.id;
  
  -- Update customers to set attended_by to null when worker is deleted
  -- but keep the customers in the database
  UPDATE customers 
  SET attended_by = NULL 
  WHERE attended_by = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;