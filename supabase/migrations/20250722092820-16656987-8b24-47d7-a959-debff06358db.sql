-- Remove all existing session management functions
DROP FUNCTION IF EXISTS public.create_user_session(uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.validate_user_session(uuid, text);  
DROP FUNCTION IF EXISTS public.invalidate_user_session(uuid);
DROP FUNCTION IF EXISTS public.create_user_session_v2(uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.validate_user_session_v2(uuid, text);
DROP FUNCTION IF EXISTS public.invalidate_user_session_v2(uuid, text);

-- Remove session columns from profiles table if they exist
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS session_token,
DROP COLUMN IF EXISTS session_expires_at,
DROP COLUMN IF EXISTS last_active;

-- Add clean session_token column for single device login
ALTER TABLE public.profiles 
ADD COLUMN session_token text DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_session_token ON public.profiles(session_token);

-- Create function to check if user can login (single device enforcement)
CREATE OR REPLACE FUNCTION public.can_user_login(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return false if user already has an active session
  RETURN NOT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND session_token IS NOT NULL
  );
END;
$$;

-- Create function to create session (single device)
CREATE OR REPLACE FUNCTION public.create_single_session(user_id uuid, token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user can login (no existing session)
  IF NOT public.can_user_login(user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Create new session
  UPDATE public.profiles 
  SET session_token = token
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$;

-- Create function to clear session
CREATE OR REPLACE FUNCTION public.clear_user_session(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET session_token = NULL
  WHERE id = user_id;
END;
$$;