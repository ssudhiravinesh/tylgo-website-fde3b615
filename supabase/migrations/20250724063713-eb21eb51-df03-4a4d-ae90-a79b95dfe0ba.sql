-- Clean up existing sessions for fresh start
DELETE FROM public.user_sessions WHERE created_at < now();

-- Create a trigger to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up expired sessions when new sessions are created
  DELETE FROM public.user_sessions 
  WHERE expires_at < now() - INTERVAL '1 day'
  AND is_active = false;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run cleanup when new sessions are inserted
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON public.user_sessions;
CREATE TRIGGER cleanup_expired_sessions_trigger
  AFTER INSERT ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_cleanup_expired_sessions();