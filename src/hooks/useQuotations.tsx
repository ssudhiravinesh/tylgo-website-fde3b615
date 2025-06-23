import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total_cost: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Joined data
  customer?: {
    name: string;
    mobile: string;
  };
  worker?: {
    name: string;
  };
}

const fetchQuotations = async (): Promise<Quotation[]> => {
  const { data, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(name, mobile),
      worker:profiles(name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotations:', error);
    throw error;
  }

  // Type assertion to ensure status is properly typed
  return (data || []).map(quotation => ({
    ...quotation,
    status: quotation.status as 'draft' | 'sent' | 'approved' | 'rejected'
  }));
};

export const useQuotations = () => {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: fetchQuotations,
  });
};

const generateQuotationNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `Q${year}${month}${day}${random}`;
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotationData: Omit<Quotation, 'id' | 'quotation_number' | 'worker_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('quotations')
        .insert([{
          ...quotationData,
          quotation_number: generateQuotationNumber(),
          worker_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating quotation:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating quotation:', error);
      toast.error(error.message || 'Error creating quotation');
    },
  });
};

export const useUpdateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: Partial<Quotation> & { id: string }) => {
      const { id, ...updates } = updateData;
      
      const { data, error } = await supabase
        .from('quotations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating quotation:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating quotation:', error);
      toast.error(error.message || 'Error updating quotation');
    },
  });
};

export const useDeleteQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotationId: string) => {
      console.log('Starting deletion process for quotation:', quotationId);
      
      // First, delete all quotation items associated with this quotation
      console.log('Deleting quotation items...');
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', quotationId);

      if (itemsError) {
        console.error('Error deleting quotation items:', itemsError);
        throw new Error(`Failed to delete quotation items: ${itemsError.message}`);
      }

      console.log('Quotation items deleted successfully');

      // Then, delete the quotation itself
      console.log('Deleting quotation...');
      const { error: quotationError } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId);

      if (quotationError) {
        console.error('Error deleting quotation:', quotationError);
        throw new Error(`Failed to delete quotation: ${quotationError.message}`);
      }

      console.log('Quotation deleted successfully');
      return quotationId;
    },
    onSuccess: (deletedId) => {
      console.log('Delete operation completed successfully for:', deletedId);
      
      // Force invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-items'] });
      
      // Remove the specific quotation from cache immediately
      queryClient.setQueryData(['quotations'], (oldData: Quotation[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(quotation => quotation.id !== deletedId);
      });
      
      // Force a refetch to ensure UI is updated
      queryClient.refetchQueries({ queryKey: ['quotations'] });
      
      toast.success('Quotation deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete operation failed:', error);
      toast.error(error.message || 'Failed to delete quotation. Please try again.');
    },
  });
};

export const useUpdateQuotationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'sent' | 'approved' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('quotations')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating quotation status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation status updated to ${data.status}`);
    },
    onError: (error: any) => {
      console.error('Error updating quotation status:', error);
      toast.error(error.message || 'Error updating quotation status');
    },
  });
};
