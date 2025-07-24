-- ==========================================
-- CLEAN BUILD: SINGLE SESSION MANAGEMENT (FIXED)
-- ==========================================

-- STEP 1: Clean slate - drop everything with CASCADE
DROP TRIGGER IF EXISTS trigger_cleanup_expired_sessions ON user_sessions;
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON user_sessions;
DROP FUNCTION IF EXISTS trigger_cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS create_user_session_v2(UUID, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS validate_user_session_v2(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS invalidate_user_session_v2(UUID, TEXT) CASCADE;

-- Drop and recreate user_sessions table
DROP TABLE IF EXISTS user_sessions CASCADE;

-- STEP 2: Create a clean user_sessions table
CREATE TABLE public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- STEP 3: Create session management functions with proper security
CREATE OR REPLACE FUNCTION public.create_user_session_v2(
    user_id UUID,
    token TEXT,
    expires_at TIMESTAMPTZ
) RETURNS TEXT[] AS $$
DECLARE
    invalidated_tokens TEXT[];
BEGIN
    -- Get all currently active session tokens for this user
    SELECT ARRAY_AGG(session_token) INTO invalidated_tokens
    FROM public.user_sessions 
    WHERE user_sessions.user_id = create_user_session_v2.user_id 
    AND is_active = TRUE;

    -- Invalidate ALL existing sessions for this user (single session rule)
    UPDATE public.user_sessions 
    SET is_active = FALSE, 
        last_activity = NOW()
    WHERE user_sessions.user_id = create_user_session_v2.user_id 
    AND is_active = TRUE;

    -- Insert the new session
    INSERT INTO public.user_sessions (user_id, session_token, expires_at, is_active, last_activity)
    VALUES (user_id, token, expires_at, TRUE, NOW());

    -- Return the tokens that were invalidated
    RETURN COALESCE(invalidated_tokens, ARRAY[]::TEXT[]);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in create_user_session_v2: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.validate_user_session_v2(
    user_id UUID,
    token TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    session_valid BOOLEAN := FALSE;
BEGIN
    -- Check if session exists, is active, and not expired
    SELECT EXISTS(
        SELECT 1 FROM public.user_sessions 
        WHERE user_sessions.user_id = validate_user_session_v2.user_id
        AND session_token = token
        AND is_active = TRUE
        AND expires_at > NOW()
    ) INTO session_valid;

    -- If session is valid, update last activity
    IF session_valid THEN
        UPDATE public.user_sessions 
        SET last_activity = NOW()
        WHERE user_sessions.user_id = validate_user_session_v2.user_id
        AND session_token = token;
    END IF;

    RETURN session_valid;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in validate_user_session_v2: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.invalidate_user_session_v2(
    user_id UUID,
    token TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF token IS NULL THEN
        -- Invalidate all sessions for the user
        UPDATE public.user_sessions 
        SET is_active = FALSE, 
            last_activity = NOW()
        WHERE user_sessions.user_id = invalidate_user_session_v2.user_id
        AND is_active = TRUE;
    ELSE
        -- Invalidate specific session
        UPDATE public.user_sessions 
        SET is_active = FALSE, 
            last_activity = NOW()
        WHERE user_sessions.user_id = invalidate_user_session_v2.user_id
        AND session_token = token
        AND is_active = TRUE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in invalidate_user_session_v2: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- STEP 4: Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired sessions
    DELETE FROM public.user_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in cleanup_expired_sessions: %', SQLERRM;
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- STEP 5: Enable real-time for session management
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;

-- STEP 6: Create trigger for automatic cleanup
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up expired sessions when new sessions are created
  DELETE FROM public.user_sessions 
  WHERE expires_at < NOW() - INTERVAL '1 day'
  AND is_active = FALSE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER trigger_cleanup_expired_sessions
    AFTER INSERT ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_cleanup_expired_sessions();