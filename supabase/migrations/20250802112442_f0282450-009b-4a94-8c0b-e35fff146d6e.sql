-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_cleanup_expired_sessions ON public.user_sessions;
DROP TRIGGER IF EXISTS trigger_session_cleanup ON public.user_sessions;

-- Drop all session-related database functions with CASCADE
DROP FUNCTION IF EXISTS public.validate_current_session() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_session_v2(uuid, text, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS public.validate_user_session_v2(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.invalidate_user_session_v2(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.create_single_session(uuid, text, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS public.validate_single_session(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.invalidate_all_user_sessions(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_session_cleanup() CASCADE;

-- Drop the user_sessions table
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- Remove token_version column from profiles table since it was added for session management
ALTER TABLE public.profiles DROP COLUMN IF EXISTS token_version;