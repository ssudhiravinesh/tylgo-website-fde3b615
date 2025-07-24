import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { singleSessionService } from '@/services/singleSessionService';
import { toast } from 'sonner';

/**
 * Enhanced Strict Session Management Hook
 * Implements single-session login with immediate invalidation
 */
export const useStrictSessionManagement = () => {
  const { user, signOut } = useAuth();
  const validationIntervalRef = useRef<NodeJS.Timeout>();
  const idleCheckIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());
  const isInitializedRef = useRef(false);

  // Handle session invalidation events
  const handleSessionInvalidation = useCallback((event: CustomEvent) => {
    const { reason } = event.detail;
    console.log('🚫 Session invalidated:', reason);
    
    let message = 'Your session has been terminated.';
    switch (reason) {
      case 'new_login':
        message = 'You have been logged in from another device.';
        break;
      case 'idle_timeout':
        message = 'Your session expired due to inactivity.';
        break;
      case 'manual_logout':
        message = 'You have been logged out.';
        break;
      case 'password_change':
        message = 'Your session was terminated due to a password change.';
        break;
      default:
        message = 'Your session has been terminated.';
    }

    toast.error(message);
    signOut();
  }, [signOut]);

  // Create session when user logs in
  const createUserSession = useCallback(async (userId: string) => {
    if (!userId || isInitializedRef.current) return;

    console.log('🔐 Creating session for user:', userId);
    isInitializedRef.current = true;

    try {
      await singleSessionService.createSession(userId);
      console.log('✅ Session created successfully');
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      toast.error('Failed to establish secure session');
      signOut();
    }
  }, [signOut]);

  // Validate session periodically
  const validateSession = useCallback(async () => {
    if (!user?.id) return;

    try {
      const validation = await singleSessionService.validateSession();
      
      if (validation.shouldSignOut) {
        console.log('🚫 Session validation failed - signing out');
        signOut();
        return;
      }

      // Update activity if session is valid
      if (validation.isValid) {
        await singleSessionService.updateActivity();
      }

    } catch (error) {
      console.error('❌ Session validation error:', error);
      signOut();
    }
  }, [user?.id, signOut]);

  // Check for idle timeout
  const checkIdleTimeout = useCallback(async () => {
    if (!user?.id) return;

    try {
      const isExpired = await singleSessionService.checkIdleTimeout();
      if (isExpired) {
        console.log('⏰ Session expired due to idle timeout');
        signOut();
      }
    } catch (error) {
      console.error('❌ Idle timeout check failed:', error);
    }
  }, [user?.id, signOut]);

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (user?.id) {
      singleSessionService.updateActivity().catch(console.error);
    }
  }, [user?.id]);

  // Setup activity tracking
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const throttledUpdateActivity = (() => {
      let timeout: NodeJS.Timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(updateActivity, 1000); // Throttle to once per second
      };
    })();

    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true);
      });
    };
  }, [updateActivity]);

  // Main session management effect
  useEffect(() => {
    if (!user?.id) {
      // User logged out - cleanup
      console.log('👤 User logged out - cleaning up session');
      singleSessionService.clearSession();
      isInitializedRef.current = false;
      
      // Clear intervals
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
        validationIntervalRef.current = undefined;
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
        idleCheckIntervalRef.current = undefined;
      }
      
      return;
    }

    // User logged in - setup session management
    console.log('👤 User logged in - setting up session management');
    
    // Create session for new login
    createUserSession(user.id);

    // Setup session validation interval (every 5 minutes)
    validationIntervalRef.current = setInterval(validateSession, 5 * 60 * 1000);

    // Setup idle timeout check interval (every minute)
    idleCheckIntervalRef.current = setInterval(checkIdleTimeout, 60 * 1000);

    // Setup session invalidation event listener
    window.addEventListener('session-invalidated', handleSessionInvalidation as EventListener);

    // Validate session immediately
    setTimeout(validateSession, 1000);

    return () => {
      // Cleanup intervals
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
      
      // Remove event listener
      window.removeEventListener('session-invalidated', handleSessionInvalidation as EventListener);
    };
  }, [user?.id, createUserSession, validateSession, checkIdleTimeout, handleSessionInvalidation]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        console.log('👁️ Tab became visible - validating session');
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, validateSession]);

  // Handle page focus
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id) {
        console.log('🎯 Window focused - validating session');
        validateSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, validateSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      singleSessionService.cleanup();
    };
  }, []);

  // Return session management functions
  return {
    getCurrentSession: () => singleSessionService.getCurrentSession(),
    invalidateAllSessions: (reason?: string) => singleSessionService.invalidateAllSessions(reason),
    validateSession,
    updateActivity
  };
};