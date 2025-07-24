import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { singleSessionService } from '@/services/singleSessionService';

export const useSecureSupabaseClient = () => {
  const { user } = useAuth();

  const withSessionValidation = useCallback(async (operation: () => Promise<any>): Promise<any> => {
    // Validate session before executing any database operation
    if (user) {
      console.log('Validating session before database operation for user:', user.id);
      
      try {
        const validation = await singleSessionService.validateSession();
        if (!validation.isValid || validation.shouldSignOut) {
          console.log('Session validation failed - rejecting database operation');
          throw new Error('Session invalid or expired. Please sign in again.');
        }
        console.log('Session valid - proceeding with database operation');
      } catch (error) {
        console.error('Session validation error:', error);
        throw new Error('Session validation failed. Please sign in again.');
      }
    }

    // Execute the operation
    return await operation();
  }, [user]);

  return {
    withSessionValidation,
    supabase
  };
};