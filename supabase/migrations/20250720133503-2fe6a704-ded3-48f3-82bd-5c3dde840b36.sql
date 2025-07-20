-- Add session management fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN session_token text DEFAULT NULL,
ADD COLUMN session_expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN last_active timestamp with time zone DEFAULT now();

-- Create index for faster session lookups
CREATE INDEX idx_profiles_session_token ON public.profiles(session_token);

-- Create function to invalidate user sessions
CREATE OR REPLACE FUNCTION public.invalidate_user_session(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    session_token = NULL,
    session_expires_at = NULL,
    last_active = now()
  WHERE id = user_id;
END;
$$;

-- Create function to create new session
CREATE OR REPLACE FUNCTION public.create_user_session(user_id uuid, token text, expires_at timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First invalidate any existing session
  PERFORM invalidate_user_session(user_id);
  
  -- Create new session
  UPDATE public.profiles 
  SET 
    session_token = token,
    session_expires_at = expires_at,
    last_active = now()
  WHERE id = user_id;
END;
$$;

-- Create function to validate session
CREATE OR REPLACE FUNCTION public.validate_user_session(user_id uuid, token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_valid boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND session_token = token 
    AND session_expires_at > now()
  ) INTO is_valid;
  
  -- Update last active if session is valid
  IF is_valid THEN
    UPDATE public.profiles 
    SET last_active = now()
    WHERE id = user_id;
  END IF;
  
  RETURN is_valid;
END;
$$;