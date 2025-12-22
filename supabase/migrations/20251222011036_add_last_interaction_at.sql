-- Add last_interaction_at column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ DEFAULT NOW();

-- Create a function to update the last_interaction_at timestamp
CREATE OR REPLACE FUNCTION update_customer_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers
    SET last_interaction_at = NEW.created_at
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on quotations table to update the customer's last_interaction_at
DROP TRIGGER IF EXISTS trigger_update_customer_last_interaction ON quotations;
CREATE TRIGGER trigger_update_customer_last_interaction
AFTER INSERT ON quotations
FOR EACH ROW
EXECUTE FUNCTION update_customer_last_interaction();

-- Backfill existing customers with the latest of their created_at or their most recent quotation created_at
UPDATE customers c
SET last_interaction_at = GREATEST(
    c.created_at,
    COALESCE((SELECT MAX(created_at) FROM quotations q WHERE q.customer_id = c.id), c.created_at)
);
