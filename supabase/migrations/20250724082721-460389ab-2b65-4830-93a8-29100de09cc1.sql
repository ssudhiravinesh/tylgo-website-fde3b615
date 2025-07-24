-- Single-Session Login Database Migration (Fixed)
-- Implements exactly one active session per user with proper constraints

-- 1. Add token_version to profiles for additional security
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- 2. Create unique index to guarantee single active session per user
CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_per_user 
ON public.user_sessions (user_id) 
WHERE is_active = TRUE;

-- 3. Add session invalidation tracking
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS invalidated_by TEXT,
ADD COLUMN IF NOT EXISTS invalidation_reason TEXT;

-- 4. Enhanced session creation function with single-session enforcement
CREATE OR REPLACE FUNCTION public.create_single_session(
    p_user_id uuid,
    p_session_token text,
    p_expires_at timestamp with time zone
) RETURNS TABLE(invalidated_tokens text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    old_tokens TEXT[];
BEGIN
    -- Collect all active session tokens for this user before invalidating
    SELECT ARRAY_AGG(session_token) INTO old_tokens
    FROM public.user_sessions 
    WHERE user_sessions.user_id = p_user_id 
    AND is_active = TRUE
    AND expires_at > NOW();

    -- Invalidate ALL existing active sessions for this user
    UPDATE public.user_sessions 
    SET 
        is_active = FALSE,
        last_activity = NOW(),
        invalidated_by = p_session_token,
        invalidation_reason = 'new_login'
    WHERE user_sessions.user_id = p_user_id 
    AND is_active = TRUE;

    -- Increment token version for additional security
    UPDATE public.profiles 
    SET token_version = token_version + 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Create the new session
    INSERT INTO public.user_sessions (
        user_id, 
        session_token, 
        expires_at, 
        is_active, 
        last_activity
    ) VALUES (
        p_user_id, 
        p_session_token, 
        p_expires_at, 
        TRUE, 
        NOW()
    );

    -- Return the invalidated tokens for notification
    RETURN QUERY SELECT COALESCE(old_tokens, ARRAY[]::TEXT[]);
END;
$$;

-- 5. Enhanced session validation function
CREATE OR REPLACE FUNCTION public.validate_single_session(
    p_user_id uuid,
    p_session_token text
) RETURNS TABLE(
    is_valid boolean,
    token_version integer,
    expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    session_valid BOOLEAN := FALSE;
    user_token_version INTEGER;
    session_expires TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user's current token version and session info
    SELECT 
        EXISTS(
            SELECT 1 FROM public.user_sessions us
            WHERE us.user_id = p_user_id
            AND us.session_token = p_session_token
            AND us.is_active = TRUE
            AND us.expires_at > NOW()
        ),
        p.token_version,
        us.expires_at
    INTO session_valid, user_token_version, session_expires
    FROM public.profiles p
    LEFT JOIN public.user_sessions us ON (
        us.user_id = p.id 
        AND us.session_token = p_session_token
        AND us.is_active = TRUE
    )
    WHERE p.id = p_user_id;

    -- Update last activity if session is valid (throttled to once per minute)
    IF session_valid THEN
        UPDATE public.user_sessions 
        SET last_activity = NOW()
        WHERE user_sessions.user_id = p_user_id
        AND session_token = p_session_token
        AND is_active = TRUE
        AND last_activity < NOW() - INTERVAL '1 minute';
    END IF;

    RETURN QUERY SELECT 
        session_valid, 
        COALESCE(user_token_version, 0),
        session_expires;
END;
$$;

-- 6. Function to invalidate all sessions for a user (for logout everywhere)
CREATE OR REPLACE FUNCTION public.invalidate_all_user_sessions(
    p_user_id uuid,
    p_reason text DEFAULT 'manual_logout'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Invalidate all active sessions
    UPDATE public.user_sessions 
    SET 
        is_active = FALSE,
        last_activity = NOW(),
        invalidation_reason = p_reason
    WHERE user_sessions.user_id = p_user_id
    AND is_active = TRUE;

    -- Increment token version
    UPDATE public.profiles 
    SET token_version = token_version + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

-- 7. Session cleanup function with proper indexing
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired and inactive sessions older than 1 day
    DELETE FROM public.user_sessions 
    WHERE (
        expires_at < NOW() - INTERVAL '1 day'
        OR (is_active = FALSE AND last_activity < NOW() - INTERVAL '1 day')
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in cleanup_expired_sessions: %', SQLERRM;
        RETURN 0;
END;
$$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
ON public.user_sessions (user_id, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_cleanup 
ON public.user_sessions (expires_at, last_activity) 
WHERE is_active = FALSE;

-- 9. Create trigger for automatic cleanup on new session creation
CREATE OR REPLACE FUNCTION public.trigger_session_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Clean up expired sessions when new sessions are created
    PERFORM public.cleanup_expired_sessions();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_cleanup_trigger ON public.user_sessions;
CREATE TRIGGER session_cleanup_trigger
    AFTER INSERT ON public.user_sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_session_cleanup();