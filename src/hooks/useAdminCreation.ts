
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAdminCreation = () => {
  const createAdminUser = async (name: string, email: string, password: string) => {
    try {
      console.log('Creating admin user:', { name, email });
      
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { name, email, password }
      });

      console.log('Admin creation response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Admin user created successfully');
      return data;
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      
      if (error.message?.includes('already exists')) {
        toast.error('A user with this email already exists');
      } else {
        toast.error(error.message || 'Failed to create admin user');
      }
      
      throw error;
    }
  };

  return { createAdminUser };
};
