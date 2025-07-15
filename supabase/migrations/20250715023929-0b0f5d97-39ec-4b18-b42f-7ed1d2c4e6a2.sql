
-- Update the worker deletion trigger to properly clean up all related data
CREATE OR REPLACE FUNCTION handle_worker_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete quotation items first (due to foreign key constraints)
  DELETE FROM quotation_items 
  WHERE quotation_id IN (
    SELECT id FROM quotations WHERE worker_id = OLD.id
  );
  
  -- Delete quotations created by the worker
  DELETE FROM quotations 
  WHERE worker_id = OLD.id;
  
  -- Delete room tile selections for customers attended by this worker
  DELETE FROM room_tile_selections 
  WHERE customer_id IN (
    SELECT id FROM customers WHERE attended_by = OLD.id
  );
  
  -- Delete rooms for customers attended by this worker
  DELETE FROM rooms 
  WHERE customer_id IN (
    SELECT id FROM customers WHERE attended_by = OLD.id
  );
  
  -- Delete customers attended by this worker
  DELETE FROM customers 
  WHERE attended_by = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
