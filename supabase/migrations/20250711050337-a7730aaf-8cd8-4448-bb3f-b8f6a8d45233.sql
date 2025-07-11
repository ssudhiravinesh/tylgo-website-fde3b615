-- Add custom_boxes field to store manual box adjustments
ALTER TABLE quotation_items 
ADD COLUMN custom_boxes integer DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN quotation_items.custom_boxes IS 'Manual adjustment to the calculated number of boxes (+/- from calculated value)';