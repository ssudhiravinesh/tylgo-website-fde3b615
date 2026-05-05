import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/utils/errorUtils';

const checkAdminPermission = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Insufficient privileges. Admin access required.');
  }

  return user;
};

export const useWorkerMutations = () => {
  const queryClient = useQueryClient();

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      console.log('Resetting password for user:', userId);
      
      await checkAdminPermission();

      // Call Supabase edge function for password reset (admin function)
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword }
      });

      console.log('Password reset response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: (error: unknown) => {
      console.error('Error resetting password:', error);
      const msg = getErrorMessage(error, 'Failed to reset password');
      if (msg.includes('Insufficient privileges')) {
        toast.error('Admin privileges required to reset passwords');
      } else if (msg.includes('Function not found')) {
        toast.error('Password reset feature is not yet implemented on the server');
      } else {
        toast.error(msg);
      }
    },
  });

  const addWorkerMutation = useMutation({
    mutationFn: async ({ name, email, password, username }: { name: string; email: string; password: string; username: string }) => {
      console.log('Creating new worker account:', email, 'username:', username);
      
      await checkAdminPermission();

      // Call Supabase edge function for worker creation (admin function)
      const { data, error } = await supabase.functions.invoke('admin-create-worker', {
        body: { name, email, password, username }
      });

      console.log('Create worker response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Worker account created successfully');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: (error: unknown) => {
      console.error('Error creating worker:', error);
      toast.error(getErrorMessage(error, 'Error creating worker account'));
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: async (workerId: string) => {
      console.log('Deleting worker:', workerId);
      
      await checkAdminPermission();

      // Delete from profiles table (this will cascade delete from auth.users due to trigger)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', workerId);

      if (error) {
        console.error('Error deleting worker profile:', error);
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Worker deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-stats'] });
    },
    onError: (error: unknown) => {
      console.error('Error deleting worker:', error);
      toast.error(getErrorMessage(error, 'Failed to delete worker'));
    },
  });

  return {
    resetPasswordMutation,
    addWorkerMutation,
    deleteWorkerMutation,
  };
};