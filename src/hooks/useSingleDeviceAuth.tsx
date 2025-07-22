import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export const useSingleDeviceAuth = () => {
  const generateSessionToken = useCallback(() => {
    return `session_${uuidv4()}_${Date.now()}`;
  }, []);

  const checkCanLogin = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('can_user_login', {
        user_id: userId
      });

      if (error) {
        console.error('Error checking login permission:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('Failed to check login permission:', error);
      return false;
    }
  }, []);

  const createSession = useCallback(async (userId: string): Promise<string | null> => {
    try {
      // First check if user can login
      const canLogin = await checkCanLogin(userId);
      if (!canLogin) {
        toast.error('Already logged in on another device. Please logout first.');
        return null;
      }

      const sessionToken = generateSessionToken();
      
      const { data, error } = await supabase.rpc('create_single_session', {
        user_id: userId,
        token: sessionToken
      });

      if (error) {
        console.error('Error creating session:', error);
        return null;
      }

      if (!data) {
        // User is already logged in on another device
        toast.error('Already logged in on another device. Please logout first.');
        return null;
      }

      // Store session token locally
      localStorage.setItem('device_session_token', sessionToken);
      console.log('Single device session created for user:', userId);
      
      return sessionToken;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }, [generateSessionToken, checkCanLogin]);

  const clearSession = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase.rpc('clear_user_session', {
        user_id: userId
      });

      if (error) {
        console.error('Error clearing session:', error);
      }

      // Clear local storage
      localStorage.removeItem('device_session_token');
      console.log('Session cleared for user:', userId);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }, []);

  return {
    checkCanLogin,
    createSession,
    clearSession
  };
};