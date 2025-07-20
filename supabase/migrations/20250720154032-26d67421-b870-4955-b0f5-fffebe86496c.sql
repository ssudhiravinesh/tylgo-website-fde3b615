-- Create a dedicated user sessions table for proper session tracking
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  last_active timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(user_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Enable real-time for session invalidation notifications
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;

-- Create function to create new session and invalidate older ones
CREATE OR REPLACE FUNCTION public.create_user_session_v2(user_id uuid, token text, expires_at timestamp with time zone)
RETURNS TABLE(invalidated_sessions text[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  older_sessions text[];
BEGIN
  -- Get tokens of older active sessions that will be invalidated
  SELECT array_agg(session_token) INTO older_sessions
  FROM public.user_sessions 
  WHERE user_sessions.user_id = create_user_session_v2.user_id 
  AND is_active = true;

  -- Mark older sessions as inactive (this will trigger real-time notification)
  UPDATE public.user_sessions 
  SET is_active = false, last_active = now()
  WHERE user_sessions.user_id = create_user_session_v2.user_id 
  AND is_active = true;
  
  -- Create new session
  INSERT INTO public.user_sessions (user_id, session_token, expires_at)
  VALUES (create_user_session_v2.user_id, create_user_session_v2.token, create_user_session_v2.expires_at);
  
  -- Return the invalidated session tokens
  RETURN QUERY SELECT older_sessions;
END;
$$;

-- Create function to validate session
CREATE OR REPLACE FUNCTION public.validate_user_session_v2(user_id uuid, token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_valid boolean := false;
BEGIN
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

-- Create function to invalidate specific session
CREATE OR REPLACE FUNCTION public.invalidate_user_session_v2(user_id uuid, token text DEFAULT NULL)
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