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
      console.log('Validating session before database operation for user:', user.id);
      const isValid = await enforceSessionValidation(user.id);
      if (!isValid) {
        console.log('Session validation failed - rejecting database operation');
        throw new Error('Session invalid or expired. Please sign in again.');
      }
      console.log('Session valid - proceeding with database operation');
    }

    // Execute the operation
    return await operation();
  }, [user, enforceSessionValidation]);

  return {
    withSessionValidation,
    supabase
  };
};