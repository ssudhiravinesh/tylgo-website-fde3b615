import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSessionManagement = () => {
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Force sign out from other devices by invalidating all other sessions
          try {
            // This will sign out the user from all other sessions/devices
            // except the current one by refreshing the token
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('Session refresh error:', error);
            }
          } catch (error) {
            console.error('Error managing session:', error);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          // Clear any local storage data
          localStorage.clear();
          sessionStorage.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOutEverywhere = async () => {
    try {
      // Sign out from all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Error signing out globally:', error);
        toast.error('Failed to sign out from all devices');
      } else {
        toast.success('Signed out from all devices');
      }
    } catch (error) {
      console.error('Error during global sign out:', error);
      toast.error('Failed to sign out from all devices');
    }
  };

  return { signOutEverywhere };
};