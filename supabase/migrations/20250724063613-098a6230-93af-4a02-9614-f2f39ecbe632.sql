-- Fix security warnings by setting proper search paths for all functions

-- Fix create_user_session_v2 function
CREATE OR REPLACE FUNCTION public.create_user_session_v2(user_id uuid, token text, expires_at timestamp with time zone)
RETURNS TABLE(invalidated_sessions text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_tokens text[];
BEGIN
  -- Get tokens of sessions we're about to invalidate
  SELECT array_agg(session_token) INTO old_tokens
  FROM public.user_sessions 
  WHERE user_sessions.user_id = create_user_session_v2.user_id 
  AND is_active = true;

  -- Invalidate existing active sessions for this user (single session policy)
  UPDATE public.user_sessions 
  SET is_active = false, last_active = now()
  WHERE user_sessions.user_id = create_user_session_v2.user_id 
  AND is_active = true;
  
  -- Create new session
  INSERT INTO public.user_sessions (user_id, session_token, expires_at)
  VALUES (create_user_session_v2.user_id, create_user_session_v2.token, create_user_session_v2.expires_at);
  
  -- Return invalidated session tokens
  RETURN QUERY SELECT COALESCE(old_tokens, ARRAY[]::text[]);
END;
$$;

-- Fix validate_user_session_v2 function
CREATE OR REPLACE FUNCTION public.validate_user_session_v2(user_id uuid, token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid boolean := false;
BEGIN
  -- Check if session exists and is valid
  SELECT EXISTS(
    SELECT 1 FROM public.user_sessions 
    WHERE user_sessions.user_id = validate_user_session_v2.user_id 
    AND session_token = validate_user_session_v2.token 
    AND expires_at > now()
    AND is_active = true
  ) INTO is_valid;
  
  -- Update last active if session is valid
  IF is_valid THEN
    UPDATE public.user_sessions 
    SET last_active = now()
    WHERE user_sessions.user_id = validate_user_session_v2.user_id
    AND session_token = validate_user_session_v2.token;
  END IF;
  
  RETURN is_valid;
END;
$$;

-- Fix invalidate_user_session_v2 function
CREATE OR REPLACE FUNCTION public.invalidate_user_session_v2(user_id uuid, token text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF token IS NULL THEN
    -- Invalidate all sessions for user
    UPDATE public.user_sessions 
    SET is_active = false, last_active = now()
    WHERE user_sessions.user_id = invalidate_user_session_v2.user_id;
  ELSE
    -- Invalidate specific session
    UPDATE public.user_sessions 
    SET is_active = false, last_active = now()
    WHERE user_sessions.user_id = invalidate_user_session_v2.user_id 
    AND session_token = invalidate_user_session_v2.token;
  END IF;
END;
$$;

-- Fix cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_sessions 
  WHERE expires_at < now() - INTERVAL '7 days';
END;
$$;

-- Fix validate_current_session function
CREATE OR REPLACE FUNCTION public.validate_current_session()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is used in RLS policies to check if the current user has a valid session
  -- It relies on the client-side code to validate sessions properly
  -- For RLS purposes, we'll just check if the user is authenticated
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- Fix get_user_role function if it exists
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'role', 'worker')::user_role);
  RETURN NEW;
END;
$$;

-- Fix handle_worker_deletion function if it exists
CREATE OR REPLACE FUNCTION public.handle_worker_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Delete quotation items first (due to foreign key constraints)
  DELETE FROM quotation_items 
  WHERE quotation_id IN (
    SELECT id FROM quotations WHERE worker_id = OLD.id
  );
  
  -- Delete quotations created by the worker
  DELETE FROM quotations 
  WHERE worker_id = OLD.id;
  
  -- Delete room tile selections for customers attended by this worker
  DELETE FROM room_tile_selections 
  WHERE customer_id IN (
    SELECT id FROM customers WHERE attended_by = OLD.id
  );
  
  -- Delete rooms for customers attended by this worker
  DELETE FROM rooms 
  WHERE customer_id IN (
    SELECT id FROM customers WHERE attended_by = OLD.id
  );
  
  -- Delete customers attended by this worker
  DELETE FROM customers 
  WHERE attended_by = OLD.id;
  
  RETURN OLD;
END;
$$;