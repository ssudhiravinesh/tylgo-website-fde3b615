-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text, -- Optional product code (e.g., DWSB-3507)
  name text NOT NULL, -- Product Name (e.g., Canis CSP-1013)
  category text NOT NULL, -- e.g., Western Toilet, Sink
  dimensions jsonb DEFAULT '{}'::jsonb, -- Store variable dimensions
  price numeric DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  showroom_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_showroom_id_fkey FOREIGN KEY (showroom_id) REFERENCES public.showrooms(id)
);

-- Enable RLS (matches other tables pattern if needed, but for now just creating table)
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
