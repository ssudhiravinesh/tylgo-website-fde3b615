-- Add unit column to products table
ALTER TABLE "public"."products" ADD COLUMN "unit" text NOT NULL DEFAULT 'mm';

-- Update RLS policies not needed as existing policies cover all columns for authenticated/public access
