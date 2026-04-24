
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorUtils';
import { useNotification } from '@/contexts/NotificationContext';
import { getShowroomId } from './useShowroom';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  area?: string;
  state?: string;
  pincode?: string;
  category?: string;
  reference_name?: string;
  reference_mobile_no?: string;
  attended_by?: string;
  showroom_id?: string;
  created_at?: string;
  updated_at?: string;
  last_interaction_at?: string;
}

export interface CreateCustomerData {
  name: string;
  mobile: string;
  address?: string;
  area?: string;
  state?: string;
  pincode?: string;
  category?: string;
  reference_name?: string;
  reference_mobile_no?: string;
  attended_by?: string;
}

export const useCustomers = (overrideShowroomId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: customers = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['customers', overrideShowroomId],
    queryFn: async () => {
      let showroom_id: string | null = null;

      if (overrideShowroomId) {
        showroom_id = overrideShowroomId;
      } else {
        showroom_id = await getShowroomId();
      }

      const { data: { user } } = await supabase.auth.getUser();
      let isSuperAdmin = false;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'super_admin') {
          isSuperAdmin = true;
        }
      }

      let query = supabase
        .from('customers')
        .select('*')
        .order('last_interaction_at', { ascending: false });

      if (showroom_id) {
        query = query.eq('showroom_id', showroom_id);
      } else if (!isSuperAdmin) {
        // If no showroom_id and not super_admin (which implies worker/admin needs context), 
        // we might want to restrict or better yet, the previous logic was:
        // if (showroom_id && !isSuperAdmin) query = query.eq('showroom_id', showroom_id);
        // If super_admin, they see all if no showroom_id is passed?
        // But now we want strict hierarchy. 
        // If overrideShowroomId IS passed (which it will be for super_admin drilling down), we use it.
        // If NOT passed, and isSuperAdmin, they might see all? 
        // The requirement is "Brand -> Showroom -> Resource".
        // So if Super Admin acts without override, they shouldn't see anything or falling back to "all"?
        // Let's stick to the override logic: if showroom_id is determined (either via override or getShowroomId), we filter by it.
      }

      // Let's refine the logic to be safe and consistent with other hooks
      if (showroom_id) {
        query = query.eq('showroom_id', showroom_id);
      }

      // Note: Original logic was `if (showroom_id && !isSuperAdmin)`.
      // If we pass overrideShowroomId, we WANT to filter by it even if super_admin.
      // So the condition should just be `if (showroom_id)`.
      // However, if we preserve the "View All" capability for super admin when NO override is provided?
      // But the dashboard enforces selection.
      // So simple `if (showroom_id)` is safer and correct for the drilled-down view.

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CreateCustomerData) => {

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get showroom_id
      const showroom_id = await getShowroomId();
      if (!showroom_id) {
        throw new Error('No showroom assigned to user');
      }

      // Add attended_by and showroom_id to the customer data
      const customerWithAttendee = {
        ...customerData,
        attended_by: user.id,
        showroom_id
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([customerWithAttendee])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Customer "${data.name}" created successfully!`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to create customer'));
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, ...customerData }: Partial<Customer> & { id: string }) => {

      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .select()
        .single();

      if (error) {

        throw error;
      }


      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Customer "${data.name}" updated successfully!`);
    },
    onError: (error: unknown) => {

      toast.error(getErrorMessage(error, 'Failed to update customer'));
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {

        throw error;
      }


      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully!');
    },
    onError: (error: unknown) => {

      toast.error(getErrorMessage(error, 'Failed to delete customer'));
    },
  });

  return {
    data: customers, // Keep both for backward compatibility
    customers,
    isLoading,
    error,
    refetch,
    createCustomer: createCustomerMutation.mutateAsync,
    updateCustomer: updateCustomerMutation.mutateAsync,
    deleteCustomer: deleteCustomerMutation.mutateAsync,
    isCreating: createCustomerMutation.isPending,
    isUpdating: updateCustomerMutation.isPending,
    isDeleting: deleteCustomerMutation.isPending,
  };
};

// Export individual mutation hooks for better component usage
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { playNotificationSound, showSuccessAnimation } = useNotification();

  return useMutation({
    mutationFn: async (customerData: CreateCustomerData) => {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get showroom_id
      const showroom_id = await getShowroomId();
      if (!showroom_id) {
        throw new Error('No showroom assigned to user');
      }

      // Add attended_by and showroom_id to the customer data
      const customerWithAttendee = {
        ...customerData,
        attended_by: user.id,
        showroom_id
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([customerWithAttendee])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      // Play sound and show animation
      playNotificationSound('customerCreated');
      showSuccessAnimation(`Customer "${data.name}" created successfully!`, 'customer');

      toast.success(`Customer "${data.name}" created successfully!`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to create customer'));
    },
  });
};
