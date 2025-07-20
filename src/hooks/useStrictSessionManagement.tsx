import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const useStrictSessionManagement = () => {
  const generateSessionToken = useCallback(() => {
    return `session_${uuidv4()}_${Date.now()}`;
  }, []);

  const invalidateLocalSession = useCallback(async () => {
    localStorage.removeItem('app_session_token');
    localStorage.removeItem('app_session_user_id');
  }, []);

  const createSession = useCallback(async (userId: string) => {
    try {
      const sessionToken = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      console.log('Creating new session for user:', userId);
      console.log('This will invalidate any existing sessions for this user');

      // Create session in database (this will invalidate any existing sessions)
      const { error } = await supabase.rpc('create_user_session', {
        user_id: userId,
        token: sessionToken,
        expires_at: expiresAt.toISOString()
      });

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      // Store session token in local storage for validation ONLY after successful DB update
      localStorage.setItem('app_session_token', sessionToken);
      localStorage.setItem('app_session_user_id', userId);

      console.log('Session created successfully for user:', userId, 'Token:', sessionToken.substring(0, 20) + '...');
      return sessionToken;
    } catch (error) {
      console.error('Failed to create session:', error);
      // Clear any potentially stale local storage data
      localStorage.removeItem('app_session_token');
      localStorage.removeItem('app_session_user_id');
      throw error;
    }
  }, [generateSessionToken]);

  const validateSession = useCallback(async (userId: string) => {
    try {
      const sessionToken = localStorage.getItem('app_session_token');
      const storedUserId = localStorage.getItem('app_session_user_id');

      console.log('Validating session for user:', userId);
      console.log('Local storage has token:', !!sessionToken, 'stored user:', storedUserId);

      if (!sessionToken || !storedUserId || storedUserId !== userId) {
        console.log('No valid session token found in localStorage or user mismatch');
        return false;
      }

      const { data, error } = await supabase.rpc('validate_user_session', {
        user_id: userId,
        token: sessionToken
      });

      if (error) {
        console.error('Error validating session:', error);
        return false;
      }

      if (!data) {
        console.log('Session validation failed - session expired, invalid, or replaced by another login');
        await invalidateLocalSession();
        return false;
      }

      console.log('Session validation successful');
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, [invalidateLocalSession]);

  const invalidateSession = useCallback(async (userId: string) => {
    try {
      await invalidateLocalSession();

      const { error } = await supabase.rpc('invalidate_user_session', {
        user_id: userId
      });

      if (error) {
        console.error('Error invalidating session:', error);
      }
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }, [invalidateLocalSession]);

  const enforceSessionValidation = useCallback(async (userId: string) => {
    if (!userId) return false;

    console.log('Enforcing session validation for user:', userId);
    const isValid = await validateSession(userId);
    
    if (!isValid) {
      console.log('Session invalid or expired, signing out user:', userId);
      
      // Clear local storage immediately
      await invalidateLocalSession();
      
      // Set a flag to prevent re-validation loops
      localStorage.setItem('session_invalidated', 'true');
      
      // Show user-friendly message
      toast.error('Your session has expired. Another device has logged in with this account.');
      
      // Force sign out cleanly without page reload to prevent loops
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error during signout:', error);
      }
      return false;
    }

    console.log('Session validation successful for user:', userId);
    return true;
  }, [validateSession, invalidateLocalSession]);

  // Set up periodic session validation
  useEffect(() => {
    const userId = localStorage.getItem('app_session_user_id');
    if (!userId) return;

    console.log('Setting up periodic session validation for user:', userId);

    // Validate session every 2 minutes for more frequent checks
    const interval = setInterval(async () => {
      console.log('Performing periodic session validation...');
      await enforceSessionValidation(userId);
    }, 2 * 60 * 1000);

    return () => {
      console.log('Cleaning up periodic session validation');
      clearInterval(interval);
    };
  }, [enforceSessionValidation]);

  // Listen for storage changes (other tabs) and visibility changes
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'app_session_token' && !e.newValue) {
        // Session was cleared in another tab, sign out
        console.log('Session cleared in another tab, signing out');
        await supabase.auth.signOut();
      }
    };

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // User returned to tab, validate session
        const userId = localStorage.getItem('app_session_user_id');
        if (userId) {
          console.log('Tab became visible, validating session...');
          await enforceSessionValidation(userId);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enforceSessionValidation]);

  return {
    createSession,
    validateSession,
    invalidateSession,
    enforceSessionValidation
  };
};