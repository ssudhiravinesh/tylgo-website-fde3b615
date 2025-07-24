import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const useStrictSessionManagement = () => {
  const realtimeChannelRef = useRef<any>(null);
  const currentSessionTokenRef = useRef<string | null>(null);

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

      // Use the new v2 function that returns invalidated sessions
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
      console.log('Invalidated older sessions:', data);
      
      return sessionToken;
    } catch (error) {
      console.error('Failed to create session:', error);
      localStorage.removeItem('app_session_token');
      localStorage.removeItem('app_session_user_id');
      currentSessionTokenRef.current = null;
      throw error;
    }
  }, [generateSessionToken]);

  const validateSession = useCallback(async (userId: string) => {
    try {
      const sessionToken = localStorage.getItem('app_session_token');
      const storedUserId = localStorage.getItem('app_session_user_id');

      if (!sessionToken || !storedUserId || storedUserId !== userId) {
        console.log('No valid session token found locally');
        await invalidateLocalSession();
        
        // Mark session as invalidated to prevent auth loops
        localStorage.setItem('session_invalidated', 'true');
        
        // Sign out the user
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 100);
        
        return false;
      }

      // Use the new v2 function
      const { data, error } = await supabase.rpc('validate_user_session_v2', {
        user_id: userId,
        token: sessionToken
      });

      if (error) {
        console.error('Error validating session:', error);
        await invalidateLocalSession();
        
        // Mark session as invalidated
        localStorage.setItem('session_invalidated', 'true');
        
        // Sign out the user
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 100);
        
        return false;
      }

      if (!data) {
        console.log('Session validation failed - session is invalid or expired');
        await invalidateLocalSession();
        
        // Mark session as invalidated
        localStorage.setItem('session_invalidated', 'true');
        
        // Show message to user about session invalidation
        toast.error('Your session has expired. Please sign in again.');
        
        // Sign out the user
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 100);
        
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      await invalidateLocalSession();
      
      // Mark session as invalidated
      localStorage.setItem('session_invalidated', 'true');
      
      // Sign out the user on validation error
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 100);
      
      return false;
    }
  }, [invalidateLocalSession]);

  const invalidateSession = useCallback(async (userId: string, specificToken?: string) => {
    try {
      const { error } = await supabase.rpc('invalidate_user_session_v2', {
        user_id: userId,
        token: specificToken || null
      });

      if (error) {
        console.error('Error invalidating session:', error);
      }

      // Only clear local storage if invalidating current session
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
    
    if (!userId || !currentToken) return;

    currentSessionTokenRef.current = currentToken;

    console.log('Setting up real-time session listener for user:', userId);

    // Create real-time channel to listen for session changes
    const channel = supabase
      .channel('session-invalidation')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time session update received:', payload);
          
          // Check if this session was invalidated
          const updatedSession = payload.new;
          if (
            updatedSession.session_token === currentSessionTokenRef.current &&
            updatedSession.is_active === false
          ) {
            console.log('Current session was invalidated by newer login');
            
            // Clear local session immediately
            invalidateLocalSession();
            
            // Mark session as invalidated to prevent auth loops
            localStorage.setItem('session_invalidated', 'true');
            
            // Show toast message
            toast.error('Your session has expired. Another device has logged in with this account.');
            
            // Sign out cleanly with a small delay to prevent loops
            setTimeout(async () => {
              try {
                await supabase.auth.signOut();
              } catch (error) {
                console.error('Error during signout:', error);
              }
            }, 500);
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
          console.log('Real-time new session insert received:', payload);
          
          // If a new session was created and it's not our current session, we might be invalidated
          const newSession = payload.new;
          if (newSession.session_token !== currentSessionTokenRef.current) {
            console.log('New session created for same user, checking if ours is still valid');
            
            // Validate our current session after a small delay to allow database to process
            setTimeout(async () => {
              const isValid = await validateSession(userId);
              if (!isValid) {
                console.log('Our session was invalidated by the new session');
                // validateSession already handles the signout and cleanup
              }
            }, 1000);
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      console.log('Cleaning up real-time session listener');
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [invalidateLocalSession]);

  // Listen for storage changes (other tabs) and visibility changes
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'app_session_token') {
        if (!e.newValue) {
          // Session was cleared in another tab, sign out
          console.log('Session cleared in another tab, signing out');
          await supabase.auth.signOut();
        } else {
          // Update current session token ref
          currentSessionTokenRef.current = e.newValue;
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // User returned to tab, validate session
        const userId = localStorage.getItem('app_session_user_id');
        if (userId) {
          console.log('Tab became visible, validating session...');
          const isValid = await validateSession(userId);
          if (!isValid) {
            console.log('Session invalid on tab focus, user will be signed out');
            // validateSession already handles signout in this case
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [validateSession]);

  return {
    createSession,
    validateSession,
    invalidateSession
  };
};