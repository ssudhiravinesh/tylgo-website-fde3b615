-- Drop all session-related database functions
DROP FUNCTION IF EXISTS public.validate_current_session();
DROP FUNCTION IF EXISTS public.create_user_session_v2(uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.validate_user_session_v2(uuid, text);
DROP FUNCTION IF EXISTS public.invalidate_user_session_v2(uuid, text);
DROP FUNCTION IF EXISTS public.trigger_cleanup_expired_sessions();
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions();
DROP FUNCTION IF EXISTS public.create_single_session(uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.validate_single_session(uuid, text);
DROP FUNCTION IF EXISTS public.invalidate_all_user_sessions(uuid, text);
DROP FUNCTION IF EXISTS public.trigger_session_cleanup();

-- Drop the user_sessions table
DROP TABLE IF EXISTS public.user_sessions;

-- Remove token_version column from profiles table since it was added for session management
ALTER TABLE public.profiles DROP COLUMN IF EXISTS token_version;