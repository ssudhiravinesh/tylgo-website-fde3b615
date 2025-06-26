
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  total_cost: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    mobile: string;
    address?: string;
  };
  worker?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateQuotationData {
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  total_cost: number;
  status?: string;
  notes?: string;
}

export const useQuotations = (userRole?: 'admin' | 'worker') => {
  const queryClient = useQueryClient();

  const {
    data: quotations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['quotations', userRole],
    queryFn: async () => {
      console.log('Fetching quotations for role:', userRole);
      
      let query = supabase
        .from('quotations')
        .select(`
          *,
          customer:customers!customer_id (
            id,
            name,
            mobile,
            address
          ),
          worker:profiles!worker_id (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quotations:', error);
        throw error;
      }

      console.log('Quotations fetched:', data?.length || 0);
      return data as Quotation[];
    },
  });

  const createQuotationMutation = useMutation({
    mutationFn: async (quotationData: CreateQuotationData) => {
      console.log('Creating quotation:', quotationData);
      const { data, error } = await supabase
        .from('quotations')
        .insert([quotationData])
        .select(`
          *,
          customer:customers!customer_id (
            id,
            name,
            mobile,
            address
          ),
          worker:profiles!worker_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Error creating quotation:', error);
        throw error;
      }

      console.log('Quotation created:', data);
      return data as Quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation "${data.quotation_number}" created successfully!`);
    },
    onError: (error: any) => {
      console.error('Quotation creation failed:', error);
      toast.error(error.message || 'Failed to create quotation');
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async ({ id, ...quotationData }: Partial<Quotation> & { id: string }) => {
      console.log('Updating quotation:', id, quotationData);
      const { data, error } = await supabase
        .from('quotations')
        .update(quotationData)
        .eq('id', id)
        .select(`
          *,
          customer:customers!customer_id (
            id,
            name,
            mobile,
            address
          ),
          worker:profiles!worker_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Error updating quotation:', error);
        throw error;
      }

      console.log('Quotation updated:', data);
      return data as Quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation "${data.quotation_number}" updated successfully!`);
    },
    onError: (error: any) => {
      console.error('Quotation update failed:', error);
      toast.error(error.message || 'Failed to update quotation');
    },
  });

  const deleteQuotationMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting quotation:', id);
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting quotation:', error);
        throw error;
      }

      console.log('Quotation deleted:', id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Quotation deletion failed:', error);
      toast.error(error.message || 'Failed to delete quotation');
    },
  });

  return {
    quotations,
    isLoading,
    error,
    refetch,
    createQuotation: createQuotationMutation.mutateAsync,
    updateQuotation: updateQuotationMutation.mutateAsync,
    deleteQuotation: deleteQuotationMutation.mutateAsync,
    isCreating: createQuotationMutation.isPending,
    isUpdating: updateQuotationMutation.isPending,
    isDeleting: deleteQuotationMutation.isPending,
  };
};
