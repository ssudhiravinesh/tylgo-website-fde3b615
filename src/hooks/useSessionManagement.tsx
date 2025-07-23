import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSessionManagement = () => {
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {        
        if (event === 'SIGNED_OUT') {
          // Clear session-related data on sign out
          localStorage.removeItem('app_session_token');
          localStorage.removeItem('app_session_user_id');
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