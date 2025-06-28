
-- Enable Row Level Security on quotations table
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert quotations
CREATE POLICY "Users can create quotations" 
  ON public.quotations 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create policy to allow authenticated users to view quotations
CREATE POLICY "Users can view quotations" 
  ON public.quotations 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create policy to allow authenticated users to update quotations
CREATE POLICY "Users can update quotations" 
  ON public.quotations 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create policy to allow authenticated users to delete quotations
CREATE POLICY "Users can delete quotations" 
  ON public.quotations 
  FOR DELETE 
  TO authenticated 
  USING (true);
