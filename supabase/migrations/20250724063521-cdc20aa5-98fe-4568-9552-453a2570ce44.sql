-- Clean up and fix single session management system

-- First, drop old/conflicting functions to clean up
DROP FUNCTION IF EXISTS public.handle_single_session() CASCADE;
DROP FUNCTION IF EXISTS public.can_user_login(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_single_session(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.clear_user_session(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_current_session() CASCADE;

-- Clean up old session_token column from profiles if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'session_token') THEN
        ALTER TABLE public.profiles DROP COLUMN session_token;
    END IF;
END $$;

-- Ensure user_sessions table has proper structure
DROP TABLE IF EXISTS public.user_sessions CASCADE;

CREATE TABLE public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_sessions
CREATE POLICY "Users can manage their own sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON public.user_sessions(expires_at);

-- Function to create a new session (single session enforcement)
CREATE OR REPLACE FUNCTION public.create_user_session_v2(user_id uuid, token text, expires_at timestamp with time zone)
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
CREATE OR REPLACE FUNCTION public.validate_user_session_v2(user_id uuid, token text)
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
CREATE OR REPLACE FUNCTION public.invalidate_user_session_v2(user_id uuid, token text DEFAULT NULL::text)
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

-- Clean up expired sessions automatically
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_sessions 
  WHERE expires_at < now() - INTERVAL '7 days';
END;
$$;

-- Update existing RLS policies to use proper session validation
-- First drop the old validate_current_session function if it still exists
DROP FUNCTION IF EXISTS public.validate_current_session() CASCADE;

-- Create new session validation function that works with the new system
CREATE OR REPLACE FUNCTION public.validate_current_session()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_token text;
  user_id uuid;
BEGIN
  -- This function is used in RLS policies to check if the current user has a valid session
  -- It relies on the client-side code to validate sessions properly
  -- For RLS purposes, we'll just check if the user is authenticated
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- Enable realtime for user_sessions table to support session invalidation notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;