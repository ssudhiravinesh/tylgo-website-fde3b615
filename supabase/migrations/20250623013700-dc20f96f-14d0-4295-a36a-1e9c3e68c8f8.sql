
-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tile-qrs', 'tile-qrs', true);

-- Create RLS policies for the QR bucket (public read access)
CREATE POLICY "Public can view QR codes" ON storage.objects
FOR SELECT USING (bucket_id = 'tile-qrs');

CREATE POLICY "Authenticated users can upload QR codes" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'tile-qrs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update QR codes" ON storage.objects
FOR UPDATE USING (bucket_id = 'tile-qrs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete QR codes" ON storage.objects
FOR DELETE USING (bucket_id = 'tile-qrs' AND auth.role() = 'authenticated');

-- Add QR code URL column to tiles table
ALTER TABLE tiles ADD COLUMN qr_code_url TEXT;
