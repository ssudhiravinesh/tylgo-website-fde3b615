-- Create staircases table
CREATE TABLE public.staircases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  customer_id uuid NOT NULL,
  number_of_steps integer NOT NULL DEFAULT 0,
  number_of_risers integer NOT NULL DEFAULT 0,
  showroom_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staircases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staircases
CREATE POLICY "Users can view showroom staircases" 
ON public.staircases 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can create showroom staircases" 
ON public.staircases 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can update showroom staircases" 
ON public.staircases 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can delete showroom staircases" 
ON public.staircases 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

-- Create staircase_tile_selections table for tracking tile assignments
CREATE TABLE public.staircase_tile_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staircase_id uuid NOT NULL REFERENCES public.staircases(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  tile_id uuid NOT NULL,
  tile_type text NOT NULL DEFAULT 'step', -- 'step' or 'riser'
  showroom_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staircase_tile_selections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staircase tile selections
CREATE POLICY "Users can view showroom staircase tile selections" 
ON public.staircase_tile_selections 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can create showroom staircase tile selections" 
ON public.staircase_tile_selections 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can update showroom staircase tile selections" 
ON public.staircase_tile_selections 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));

CREATE POLICY "Users can delete showroom staircase tile selections" 
ON public.staircase_tile_selections 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND showroom_id = get_user_showroom_id(auth.uid()));