
-- Create user role enum
CREATE TYPE user_role AS ENUM ('admin', 'worker');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  attended_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tiles table
CREATE TABLE public.tiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  size_length INTEGER NOT NULL,
  size_breadth INTEGER NOT NULL,
  price_per_sqm DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  worker_id UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  total_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotation_items table
CREATE TABLE public.quotation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  tile_id UUID REFERENCES public.tiles(id) NOT NULL,
  room_id UUID REFERENCES public.rooms(id) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for customers
CREATE POLICY "Workers can view all customers" ON public.customers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can create customers" ON public.customers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can update customers they attended" ON public.customers
  FOR UPDATE USING (attended_by = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for tiles
CREATE POLICY "Everyone can view tiles" ON public.tiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tiles" ON public.tiles
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for rooms
CREATE POLICY "Everyone can view rooms" ON public.rooms
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage rooms" ON public.rooms
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for quotations
CREATE POLICY "Workers can view all quotations" ON public.quotations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Workers can create quotations" ON public.quotations
  FOR INSERT WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers can update their own quotations" ON public.quotations
  FOR UPDATE USING (worker_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete quotations" ON public.quotations
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for quotation_items
CREATE POLICY "Users can view quotation items" ON public.quotation_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quotations 
      WHERE id = quotation_id 
      AND (worker_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
    )
  );

CREATE POLICY "Users can manage quotation items" ON public.quotation_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quotations 
      WHERE id = quotation_id 
      AND (worker_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
    )
  );

-- Insert sample data for tiles
INSERT INTO public.tiles (code, name, size_length, size_breadth, price_per_sqm) VALUES
('TH001', 'Marble Classic White', 600, 600, 450.00),
('TH002', 'Wooden Oak Brown', 800, 200, 580.00),
('TH003', 'Stone Grey Textured', 300, 300, 320.00),
('TH004', 'Ceramic Blue Ocean', 400, 400, 275.00),
('TH005', 'Granite Black Pearl', 600, 300, 680.00),
('TH006', 'Mosaic Multi Color', 250, 250, 420.00);

-- Insert sample data for rooms
INSERT INTO public.rooms (name) VALUES
('Living Room'),
('Bedroom'),
('Kitchen'),
('Bathroom'),
('Dining Room'),
('Balcony'),
('Study Room'),
('Guest Room');
