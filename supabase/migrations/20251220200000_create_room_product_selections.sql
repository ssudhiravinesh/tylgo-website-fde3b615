-- Create room_product_selections table
CREATE TABLE public.room_product_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  product_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  quantity integer DEFAULT 1,
  showroom_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT room_product_selections_pkey PRIMARY KEY (id),
  CONSTRAINT fk_room_product_selections_room FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_product_selections_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_product_selections_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_product_selections_showroom FOREIGN KEY (showroom_id) REFERENCES public.showrooms(id)
);

-- Add index for performance
CREATE INDEX idx_room_product_selections_room_id ON public.room_product_selections (room_id);
CREATE INDEX idx_room_product_selections_customer_id ON public.room_product_selections (customer_id);

-- Enable RLS
ALTER TABLE public.room_product_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable all access for authenticated users" ON public.room_product_selections
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
