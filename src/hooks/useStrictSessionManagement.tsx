import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const useStrictSessionManagement = () => {
  const realtimeChannelRef = useRef<any>(null);
  const currentSessionTokenRef = useRef<string | null>(null);
  const isSigningOutRef = useRef(false);

  const generateSessionToken = useCallback(() => {
    return `session_${uuidv4()}_${Date.now()}`;
  }, []);

  const invalidateLocalSession = useCallback(async () => {
    localStorage.removeItem('app_session_token');
    localStorage.removeItem('app_session_user_id');
    currentSessionTokenRef.current = null;
  }, []);

  const createSession = useCallback(async (userId: string) => {
    try {
      const sessionToken = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      console.log('Creating new session for user:', userId);

      // Use the v2 function that returns invalidated sessions
      const { data, error } = await supabase.rpc('create_user_session_v2', {
        user_id: userId,
        token: sessionToken,
        expires_at: expiresAt.toISOString()
      });

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }

      // Store session token and update ref
      localStorage.setItem('app_session_token', sessionToken);
      localStorage.setItem('app_session_user_id', userId);
      currentSessionTokenRef.current = sessionToken;

      console.log('Session created successfully for user:', userId);
      if (data && data.length > 0) {
        console.log('Invalidated older sessions:', data.length);
      }
      
      return sessionToken;
    } catch (error) {
      console.error('Failed to create session:', error);
      await invalidateLocalSession();
      throw error;
    }
  }, [generateSessionToken, invalidateLocalSession]);

  const signOutUser = useCallback(async (showToast = true, toastMessage = 'Your session has expired. Please sign in again.') => {
    if (isSigningOutRef.current) {
      console.log('Already signing out, skipping...');
      return;
    }
    
    isSigningOutRef.current = true;
    
    try {
      console.log('Signing out user due to session invalidation');
      
      // Clear local session first
      await invalidateLocalSession();
      
      // Mark session as invalidated to prevent loops
      localStorage.setItem('session_invalidated', 'true');
      
      // Show toast if requested
      if (showToast) {
        toast.error(toastMessage);
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during signout:', error);
    } finally {
      // Reset the flag after a delay
      setTimeout(() => {
        isSigningOutRef.current = false;
      }, 1000);
    }
  }, [invalidateLocalSession]);

  const validateSession = useCallback(async (userId: string) => {
    try {
      const sessionToken = localStorage.getItem('app_session_token');
      const storedUserId = localStorage.getItem('app_session_user_id');

      if (!sessionToken || !storedUserId || storedUserId !== userId) {
        console.log('No valid session token found locally');
        await signOutUser(false);
        return false;
      }

      // Use the v2 function
      const { data, error } = await supabase.rpc('validate_user_session_v2', {
        user_id: userId,
        token: sessionToken
      });

      if (error) {
        console.error('Error validating session:', error);
        await signOutUser();
        return false;
      }

      if (!data) {
        console.log('Session validation failed - session is invalid or expired');
        await signOutUser();
        return false;
      }

      console.log('Session validation successful');
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      await signOutUser();
      return false;
    }
  }, [signOutUser]);

  const invalidateSession = useCallback(async (userId: string, specificToken?: string) => {
    try {
      const { error } = await supabase.rpc('invalidate_user_session_v2', {
        user_id: userId,
        token: specificToken || null
      });

      if (error) {
        console.error('Error invalidating session:', error);
      } else {
        console.log('Session invalidated successfully');
      }

      // Only clear local storage if invalidating current session or no specific token
      if (!specificToken || specificToken === currentSessionTokenRef.current) {
        await invalidateLocalSession();
      }
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }, [invalidateLocalSession]);

  // Real-time session invalidation listener
  useEffect(() => {
    const userId = localStorage.getItem('app_session_user_id');
    const currentToken = localStorage.getItem('app_session_token');
    
    if (!userId || !currentToken) {
      console.log('No session data found, skipping real-time listener setup');
      return;
    }

    currentSessionTokenRef.current = currentToken;

    console.log('Setting up real-time session listener for user:', userId);

    // Create real-time channel to listen for session changes
    const channel = supabase
      .channel(`session-management-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time session UPDATE received:', payload);
          
          const updatedSession = payload.new;
          
          // Check if our current session was invalidated
          if (
            updatedSession.session_token === currentSessionTokenRef.current &&
            updatedSession.is_active === false
          ) {
            console.log('Current session was invalidated by newer login');
            
            signOutUser(true, 'Your session has expired. Another device has logged in with this account.');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time new session INSERT received:', payload);
          
          const newSession = payload.new;
          
          // If a new session was created and it's not our current session
          if (newSession.session_token !== currentSessionTokenRef.current && newSession.is_active) {
            console.log('New active session detected for same user - this session should be invalidated');
            
            // Our session should have been invalidated by the database function
            // Force sign out immediately since only one session is allowed
            signOutUser(true, 'Another device has logged in with this account. You have been signed out.');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time session DELETE received:', payload);
          
          const deletedSession = payload.old;
          
          // If our session was deleted
          if (deletedSession.session_token === currentSessionTokenRef.current) {
            console.log('Current session was deleted');
            signOutUser(true, 'Your session has been terminated.');
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('Cleaning up real-time session listener');
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, []); // Remove dependencies to prevent re-subscription

  // Listen for storage changes (other tabs) and visibility changes
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'app_session_token') {
        if (!e.newValue && currentSessionTokenRef.current) {
          // Session was cleared in another tab, sign out
          console.log('Session cleared in another tab, signing out');
          await signOutUser(false);
        } else if (e.newValue && e.newValue !== currentSessionTokenRef.current) {
          // Update current session token ref
          console.log('Session token updated in another tab');
          currentSessionTokenRef.current = e.newValue;
        }
      }
      
      if (e.key === 'session_invalidated' && e.newValue === 'true') {
        // Another tab detected session invalidation
        console.log('Session invalidation detected in another tab');
        await signOutUser(false);
      }
    };

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // User returned to tab, validate session
        const userId = localStorage.getItem('app_session_user_id');
        if (userId && !isSigningOutRef.current) {
          console.log('Tab became visible, validating session...');
          try {
            const isValid = await validateSession(userId);
            if (!isValid) {
              console.log('Session invalid on tab focus');
            }
          } catch (error) {
            console.error('Error validating session on visibility change:', error);
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      // Clean up any pending operations
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [validateSession, signOutUser]);

  return {
    createSession,
    validateSession,
    invalidateSession
  };
};