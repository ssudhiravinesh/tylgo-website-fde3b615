-- Clean up existing conflicting functions and rebuild session management system

-- Drop existing conflicting functions
DROP FUNCTION IF EXISTS public.create_user_session_v2(expires_at timestamp with time zone, token text, user_id uuid);
DROP FUNCTION IF EXISTS public.create_user_session_v2(user_id uuid, token text, expires_at timestamp with time zone);
DROP FUNCTION IF EXISTS public.validate_user_session_v2(user_id uuid, token text);
DROP FUNCTION IF EXISTS public.validate_user_session_v2(token text, user_id uuid);
DROP FUNCTION IF EXISTS public.invalidate_user_session_v2(user_id uuid, token text);

-- Drop table if exists to start fresh
DROP TABLE IF EXISTS public.user_sessions;

-- Create user_sessions table
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  last_active timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_active ON public.user_sessions(user_id, is_active);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Configure for Realtime
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;

-- Create session management functions with consistent parameter order

-- Function to create a new session (invalidates existing sessions)
CREATE OR REPLACE FUNCTION public.create_user_session_v2(
  user_id uuid, 
  token text, 
  expires_at timestamp with time zone
) 
RETURNS TABLE(invalidated_sessions text[])
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to validate a session
CREATE OR REPLACE FUNCTION public.validate_user_session_v2(
  user_id uuid, 
  token text
) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to invalidate sessions
CREATE OR REPLACE FUNCTION public.invalidate_user_session_v2(
  user_id uuid, 
  token text DEFAULT NULL
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Update validate_current_session function to use new table
CREATE OR REPLACE FUNCTION public.validate_current_session()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has a valid session in user_sessions table
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_sessions 
    WHERE user_id = auth.uid() 
    AND expires_at > now()
    AND is_active = true
  );
END;
$$;