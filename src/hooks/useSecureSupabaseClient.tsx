import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useStrictSessionManagement } from './useStrictSessionManagement';

export const useSecureSupabaseClient = () => {
  const { user } = useAuth();
  const { enforceSessionValidation } = useStrictSessionManagement();

  const withSessionValidation = useCallback(async (operation: () => Promise<any>): Promise<any> => {
    // Validate session before executing any database operation
    if (user) {
      const isValid = await enforceSessionValidation(user.id);
      if (!isValid) {
        throw new Error('Session invalid or expired');
      }
    }

    // Execute the operation
    return await operation();
  }, [user, enforceSessionValidation]);

  return {
    withSessionValidation,
    supabase
  };
};