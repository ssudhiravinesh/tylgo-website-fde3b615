-- Migration: Make tile_id nullable in quotation_items to support product-only items
-- This allows quotation items to be either tile items (with tile_id) or product items (with product_id)

ALTER TABLE quotation_items
ALTER COLUMN tile_id DROP NOT NULL;

-- Also make area nullable since products don't have an area
ALTER TABLE quotation_items
ALTER COLUMN area DROP NOT NULL;
