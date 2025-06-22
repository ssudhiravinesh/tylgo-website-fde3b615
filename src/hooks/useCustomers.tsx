
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  attended_by?: string;
  created_at: string;
  updated_at?: string;
}

// Mock data for demonstration
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    mobile: '+91 98765 43210',
    address: '123 Main Street, Mumbai, Maharashtra 400001',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Priya Sharma',
    mobile: '+91 87654 32109',
    address: '456 Park Avenue, Delhi 110001',
    created_at: new Date().toISOString()
  }
];

export const useCustomers = () => {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [isLoading] = useState(false);

  return {
    data: customers,
    isLoading
  };
};

export const useCreateCustomer = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    setIsPending(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCustomer: Customer = {
        ...customerData,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      
      toast.success('Customer created successfully');
      return newCustomer;
    } catch (error) {
      toast.error('Error creating customer');
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return {
    mutateAsync,
    isPending
  };
};

export const useUpdateCustomer = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (updateData: Partial<Customer> & { id: string }) => {
    setIsPending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Customer updated successfully');
      return updateData;
    } catch (error) {
      toast.error('Error updating customer');
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return {
    mutateAsync,
    isPending
  };
};

export const useDeleteCustomer = () => {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (customerId: string) => {
    setIsPending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Customer deleted successfully');
    } catch (error) {
      toast.error('Error deleting customer');
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return {
    mutateAsync,
    isPending
  };
};
