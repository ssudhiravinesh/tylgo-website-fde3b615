import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSessionTest = () => {
  const testSessionEnforcement = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No user logged in');
        return;
      }

      // Check if user has active session in user_sessions table
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('session_token, expires_at, last_active, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        toast.error('Failed to check session status');
        console.error('Session check error:', error);
        return;
      }

      const localToken = localStorage.getItem('app_session_token');
      const localUserId = localStorage.getItem('app_session_user_id');
      const activeSession = sessions?.[0];

      console.log('=== SESSION ENFORCEMENT TEST ===');
      console.log('User ID:', user.id);
      console.log('Local storage token:', localToken?.substring(0, 20) + '...');
      console.log('Local storage user ID:', localUserId);
      console.log('Database session token:', activeSession?.session_token?.substring(0, 20) + '...');
      console.log('Session expires at:', activeSession?.expires_at);
      console.log('Last active:', activeSession?.last_active);
      console.log('Tokens match:', localToken === activeSession?.session_token);
      console.log('Session valid:', activeSession?.expires_at && new Date(activeSession.expires_at) > new Date());
      console.log('=== END TEST ===');

      if (localToken === activeSession?.session_token) {
        toast.success('Session tokens match - single session enforced');
      } else {
        toast.error('Session token mismatch - this session should be invalid');
      }
    } catch (error) {
      console.error('Session test error:', error);
      toast.error('Session test failed');
    }
  }, []);

  const simulateSecondDeviceLogin = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No user logged in');
        return;
      }

      // Simulate what happens when another device logs in
      // by directly calling create_user_session_v2
      const newToken = `simulation_${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase.rpc('create_user_session_v2', {
        user_id: user.id,
        token: newToken,
        expires_at: expiresAt.toISOString()
      });

      if (error) {
        toast.error('Failed to simulate second device login');
        console.error('Simulation error:', error);
        return;
      }

      toast.info('Simulated second device login - your current session should be invalidated soon');
      console.log('Simulated second device login with token:', newToken.substring(0, 20) + '...');
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Failed to simulate second device login');
    }
  }, []);

  return {
    testSessionEnforcement,
    simulateSecondDeviceLogin
  };
};