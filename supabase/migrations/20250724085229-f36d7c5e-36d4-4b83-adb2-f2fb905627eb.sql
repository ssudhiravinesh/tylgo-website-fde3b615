-- Fix critical RLS security vulnerabilities
-- Remove overly permissive policies and implement proper role-based access control

-- 1. Fix quotations table RLS policies
DROP POLICY IF EXISTS "Users can view their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can insert their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can update their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can delete their own quotations" ON public.quotations;

-- Create secure quotations policies
CREATE POLICY "Workers can view their own quotations" 
ON public.quotations FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    worker_id = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can create quotations for their customers" 
ON public.quotations FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    worker_id = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can update their own quotations" 
ON public.quotations FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    worker_id = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can delete their own quotations" 
ON public.quotations FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    worker_id = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

-- 2. Fix rooms table RLS policies
DROP POLICY IF EXISTS "Users can view their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can delete their own rooms" ON public.rooms;

-- Create secure rooms policies
CREATE POLICY "Workers can view rooms for their customers" 
ON public.rooms FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can create rooms for their customers" 
ON public.rooms FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can update rooms for their customers" 
ON public.rooms FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can delete rooms for their customers" 
ON public.rooms FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

-- 3. Fix room_tile_selections table RLS policies
DROP POLICY IF EXISTS "Users can view their own room tile selections" ON public.room_tile_selections;
DROP POLICY IF EXISTS "Users can insert their own room tile selections" ON public.room_tile_selections;
DROP POLICY IF EXISTS "Users can update their own room tile selections" ON public.room_tile_selections;
DROP POLICY IF EXISTS "Users can delete their own room tile selections" ON public.room_tile_selections;

-- Create secure room_tile_selections policies
CREATE POLICY "Workers can view tile selections for their customers" 
ON public.room_tile_selections FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can create tile selections for their customers" 
ON public.room_tile_selections FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can update tile selections for their customers" 
ON public.room_tile_selections FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can delete tile selections for their customers" 
ON public.room_tile_selections FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_id AND c.attended_by = auth.uid()
    ) OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

-- 4. Fix customers table RLS policies  
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

-- Create secure customers policies
CREATE POLICY "Workers can view their assigned customers" 
ON public.customers FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    attended_by = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can create customers assigned to them" 
ON public.customers FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    attended_by = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can update their assigned customers" 
ON public.customers FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    attended_by = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

CREATE POLICY "Workers can delete their assigned customers" 
ON public.customers FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    attended_by = auth.uid() OR 
    public.get_user_role(auth.uid()) = 'admin'
  )
);

-- Add audit logging for security monitoring
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id uuid,
  details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details,
    created_at
  ) VALUES (
    event_type,
    user_id,
    details,
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log to system if audit table doesn't exist
    RAISE LOG 'Security event: % for user: % - %', event_type, user_id, details;
END;
$$;

-- Create security audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.security_audit_log FOR SELECT 
USING (public.get_user_role(auth.uid()) = 'admin');

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log FOR INSERT 
WITH CHECK (true);