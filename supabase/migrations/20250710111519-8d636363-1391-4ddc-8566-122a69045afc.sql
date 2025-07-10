-- Create a trigger to handle worker deletion
-- When a worker is deleted, update their quotations to still be accessible but mark worker as null
CREATE OR REPLACE FUNCTION handle_worker_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quotations to set worker_id to null when worker is deleted
  -- but keep the quotations accessible to admins
  UPDATE quotations 
  SET worker_id = NULL 
  WHERE worker_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_worker_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW 
  WHEN (OLD.role = 'worker')
  EXECUTE FUNCTION handle_worker_deletion();