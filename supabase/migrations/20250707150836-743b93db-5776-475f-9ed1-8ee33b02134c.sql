-- Create storage bucket for tile images
INSERT INTO storage.buckets (id, name, public) VALUES ('tile-images', 'tile-images', true);

-- Create storage policies for tile images
CREATE POLICY "Tile images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tile-images');

CREATE POLICY "Admins can upload tile images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tile-images' 
  AND get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Admins can update tile images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'tile-images' 
  AND get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Admins can delete tile images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tile-images' 
  AND get_user_role(auth.uid()) = 'admin'
);