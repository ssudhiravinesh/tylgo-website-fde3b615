
-- Create profiles table for user management (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  attended_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tiles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.tiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  size_length NUMERIC NOT NULL,
  size_breadth NUMERIC NOT NULL,
  price_per_sqm NUMERIC NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  length NUMERIC NOT NULL,
  breadth NUMERIC NOT NULL,
  area NUMERIC,
  surface_type TEXT DEFAULT 'floor',
  unit TEXT DEFAULT 'ft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotations table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.profiles(id),
  total_cost NUMERIC NOT NULL,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotation_items table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  tile_id UUID REFERENCES public.tiles(id),
  room_id UUID REFERENCES public.rooms(id),
  area NUMERIC NOT NULL,
  tiles_required INTEGER NOT NULL,
  boxes_needed INTEGER NOT NULL,
  item_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles (drop existing policies first)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

-- Create RLS policies for tiles
DROP POLICY IF EXISTS "Authenticated users can view tiles" ON public.tiles;
DROP POLICY IF EXISTS "Authenticated users can insert tiles" ON public.tiles;
DROP POLICY IF EXISTS "Authenticated users can update tiles" ON public.tiles;
DROP POLICY IF EXISTS "Authenticated users can delete tiles" ON public.tiles;
CREATE POLICY "Authenticated users can view tiles" ON public.tiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tiles" ON public.tiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tiles" ON public.tiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tiles" ON public.tiles FOR DELETE TO authenticated USING (true);

-- Create RLS policies for rooms
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can delete rooms" ON public.rooms;
CREATE POLICY "Authenticated users can view rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (true);

-- Create RLS policies for quotations
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can delete quotations" ON public.quotations;
CREATE POLICY "Authenticated users can view quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quotations" ON public.quotations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete quotations" ON public.quotations FOR DELETE TO authenticated USING (true);

-- Create RLS policies for quotation_items
DROP POLICY IF EXISTS "Authenticated users can view quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Authenticated users can insert quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Authenticated users can update quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Authenticated users can delete quotation_items" ON public.quotation_items;
CREATE POLICY "Authenticated users can view quotation_items" ON public.quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quotation_items" ON public.quotation_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quotation_items" ON public.quotation_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete quotation_items" ON public.quotation_items FOR DELETE TO authenticated USING (true);

-- Create or replace function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample tiles data (only if not already exists)
INSERT INTO public.tiles (code, name, size_length, size_breadth, price_per_sqm) 
SELECT * FROM (VALUES
  ('TH001', 'Marble Classic White', 600, 600, 450),
  ('TH002', 'Wooden Oak Brown', 800, 200, 580),
  ('TH003', 'Stone Grey Textured', 300, 300, 320),
  ('TH004', 'Ceramic Blue Ocean', 400, 400, 275),
  ('TH005', 'Granite Black Pearl', 600, 300, 680),
  ('TH006', 'Mosaic Multi Color', 250, 250, 420)
) AS v(code, name, size_length, size_breadth, price_per_sqm)
WHERE NOT EXISTS (SELECT 1 FROM public.tiles WHERE tiles.code = v.code);
