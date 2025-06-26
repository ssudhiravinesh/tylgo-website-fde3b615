
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  reference_name?: string;
  reference_mobile_no?: string;
  attended_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCustomerData {
  name: string;
  mobile: string;
  address?: string;
  reference_name?: string;
  reference_mobile_no?: string;
  attended_by?: string;
}

export const useCustomers = () => {
  const queryClient = useQueryClient();

  const {
    data: customers = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      console.log('Fetching customers...');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }

      console.log('Customers fetched:', data?.length || 0);
      return data as Customer[];
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CreateCustomerData) => {
      console.log('Creating customer:', customerData);
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        throw error;
      }

      console.log('Customer created:', data);
      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Customer "${data.name}" created successfully!`);
    },
    onError: (error: any) => {
      console.error('Customer creation failed:', error);
      toast.error(error.message || 'Failed to create customer');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, ...customerData }: Partial<Customer> & { id: string }) => {
      console.log('Updating customer:', id, customerData);
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer:', error);
        throw error;
      }

      console.log('Customer updated:', data);
      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Customer "${data.name}" updated successfully!`);
    },
    onError: (error: any) => {
      console.error('Customer update failed:', error);
      toast.error(error.message || 'Failed to update customer');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting customer:', id);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting customer:', error);
        throw error;
      }

      console.log('Customer deleted:', id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Customer deletion failed:', error);
      toast.error(error.message || 'Failed to delete customer');
    },
  });

  return {
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
