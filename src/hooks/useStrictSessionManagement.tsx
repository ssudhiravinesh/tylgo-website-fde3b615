import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const useStrictSessionManagement = () => {
  const generateSessionToken = useCallback(() => {
    return `session_${uuidv4()}_${Date.now()}`;
  }, []);

  const createSession = useCallback(async (userId: string) => {
    try {
      const sessionToken = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      // Store session token in local storage for validation
      localStorage.setItem('app_session_token', sessionToken);
      localStorage.setItem('app_session_user_id', userId);

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

      console.log('Session created successfully for user:', userId);
      return sessionToken;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, [generateSessionToken]);

  const validateSession = useCallback(async (userId: string) => {
    try {
      const sessionToken = localStorage.getItem('app_session_token');
      const storedUserId = localStorage.getItem('app_session_user_id');

      if (!sessionToken || !storedUserId || storedUserId !== userId) {
        console.log('No valid session token found in localStorage');
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
        console.log('Session validation failed - session expired or invalid');
        await invalidateLocalSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, []);

  const invalidateLocalSession = useCallback(async () => {
    localStorage.removeItem('app_session_token');
    localStorage.removeItem('app_session_user_id');
  }, []);

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

    const isValid = await validateSession(userId);
    
    if (!isValid) {
      console.log('Session invalid, signing out user');
      toast.error('Your session has expired or is invalid. Please sign in again.');
      
      // Sign out the user from Supabase
      await supabase.auth.signOut();
      return false;
    }

    return true;
  }, [validateSession]);

  // Set up periodic session validation
  useEffect(() => {
    const userId = localStorage.getItem('app_session_user_id');
    if (!userId) return;

    // Validate session every 5 minutes
    const interval = setInterval(async () => {
      await enforceSessionValidation(userId);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [enforceSessionValidation]);

  // Listen for storage changes (other tabs)
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'app_session_token' && !e.newValue) {
        // Session was cleared in another tab, sign out
        console.log('Session cleared in another tab, signing out');
        await supabase.auth.signOut();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    createSession,
    validateSession,
    invalidateSession,
    enforceSessionValidation
  };
};