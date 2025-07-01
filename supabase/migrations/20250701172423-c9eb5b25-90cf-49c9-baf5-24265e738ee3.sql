
-- Add wastage_percentage column to quotations table
ALTER TABLE quotations ADD COLUMN wastage_percentage NUMERIC DEFAULT 10;

-- Add a comment to describe the column
COMMENT ON COLUMN quotations.wastage_percentage IS 'Wastage percentage applied to tile calculations, defaults to 10%';
