-- Add qr_code_url column to products table
ALTER TABLE "public"."products" ADD COLUMN "qr_code_url" text;

-- Create product-qrs storage bucket
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('product-qrs', 'product-qrs', true);

-- Policy to allow public read access to product-qrs bucket
CREATE POLICY "Public Access" ON "storage"."objects"
AS PERMISSIVE FOR SELECT
TO public
USING (bucket_id = 'product-qrs');

-- Policy to allow authenticated users to upload to product-qrs bucket
CREATE POLICY "Authenticated Upload" ON "storage"."objects"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-qrs');

-- Policy to allow authenticated users to update their uploads in product-qrs bucket
CREATE POLICY "Authenticated Update" ON "storage"."objects"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (bucket_id = 'product-qrs');

-- Policy to allow authenticated users to delete from product-qrs bucket
CREATE POLICY "Authenticated Delete" ON "storage"."objects"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (bucket_id = 'product-qrs');
