
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'worker');

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  attended_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  length DECIMAL(10,2) NOT NULL,
  breadth DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ft',
  surface_type TEXT NOT NULL DEFAULT 'floor', -- 'floor' or 'wall'
  area DECIMAL(10,2) GENERATED ALWAYS AS (length * breadth) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tiles table
CREATE TABLE public.tiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  size_length DECIMAL(8,2) NOT NULL, -- in cm
  size_breadth DECIMAL(8,2) NOT NULL, -- in cm
  price_per_sqm DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.profiles(id),
  total_cost DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotation_items table
CREATE TABLE public.quotation_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id),
  tile_id UUID REFERENCES public.tiles(id),
  area DECIMAL(10,2) NOT NULL,
  tiles_required INTEGER NOT NULL,
  boxes_needed INTEGER NOT NULL,
  item_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for customers
CREATE POLICY "Workers can view their own customers, admins view all" ON public.customers 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.id = customers.attended_by)
    )
  );

CREATE POLICY "Workers can create customers" ON public.customers 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND attended_by = auth.uid()
    )
  );

CREATE POLICY "Workers can update their own customers, admins update all" ON public.customers 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.id = customers.attended_by)
    )
  );

-- RLS Policies for rooms
CREATE POLICY "Access rooms based on customer access" ON public.rooms 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customers, public.profiles 
      WHERE customers.id = rooms.customer_id 
      AND profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.id = customers.attended_by)
    )
  );

-- RLS Policies for tiles (readable by all authenticated users)
CREATE POLICY "All authenticated users can view tiles" ON public.tiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only admins can manage tiles" ON public.tiles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- RLS Policies for quotations
CREATE POLICY "Workers can view their own quotations, admins view all" ON public.quotations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.id = quotations.worker_id)
    )
  );

CREATE POLICY "Workers can create quotations" ON public.quotations 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND worker_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update their own quotations, admins update all" ON public.quotations 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.id = quotations.worker_id)
    )
  );

-- RLS Policies for quotation_items
CREATE POLICY "Access quotation_items based on quotation access" ON public.quotation_items 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quotations, public.profiles 
      WHERE quotations.id = quotation_items.quotation_id 
      AND profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.id = quotations.worker_id)
    )
  );

-- Function to handle new user registration
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

-- Trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample tiles data
INSERT INTO public.tiles (code, name, size_length, size_breadth, price_per_sqm, image_url) VALUES
('VT001', 'Marble White Classic', 60, 60, 1250.00, '/placeholder.svg'),
('VT002', 'Granite Black Pearl', 60, 60, 1450.00, '/placeholder.svg'),
('VT003', 'Ceramic Beige Elegance', 30, 60, 850.00, '/placeholder.svg'),
('VT004', 'Porcelain Grey Stone', 60, 120, 1680.00, '/placeholder.svg'),
('VT005', 'Mosaic Blue Ocean', 30, 30, 2200.00, '/placeholder.svg'),
('VT006', 'Wood Look Brown Oak', 20, 120, 1350.00, '/placeholder.svg'),
('VT007', 'Metro White Subway', 10, 30, 950.00, '/placeholder.svg'),
('VT008', 'Hexagon Black Matte', 25, 25, 1750.00, '/placeholder.svg'),
('VT009', 'Travertine Cream Natural', 40, 40, 1150.00, '/placeholder.svg'),
('VT010', 'Slate Dark Charcoal', 30, 60, 1380.00, '/placeholder.svg');
