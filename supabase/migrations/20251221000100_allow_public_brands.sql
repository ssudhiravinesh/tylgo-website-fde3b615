-- Allow public read access to brands table so the landing page can list them
CREATE POLICY "Allow public read access to brands"
ON public.brands
FOR SELECT
TO public
USING (true);
