
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
      
      // Get current user to verify permissions
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated:', userError);
        throw new Error('User not authenticated');
      }
      console.log('Current user ID:', user.id);

      // First, verify the quotation exists and get its details
      const { data: existingQuotation, error: checkError } = await supabase
        .from('quotations')
        .select('id, worker_id, quotation_number')
        .eq('id', quotationId)
        .single();

      if (checkError) {
        console.error('Error checking quotation existence:', checkError);
        throw new Error(`Error checking quotation: ${checkError.message}`);
      }

      if (!existingQuotation) {
        console.error('Quotation not found');
        throw new Error('Quotation not found');
      }

      console.log('Quotation found:', existingQuotation);
      console.log('Quotation worker_id:', existingQuotation.worker_id);
      console.log('Current user_id:', user.id);

      // Delete quotation items first
      console.log('Deleting quotation items...');
      const { error: itemsError, count: itemsCount } = await supabase
        .from('quotation_items')
        .delete({ count: 'exact' })
        .eq('quotation_id', quotationId);

      if (itemsError) {
        console.error('Error deleting quotation items:', itemsError);
        throw new Error(`Failed to delete quotation items: ${itemsError.message}`);
      }

      console.log(`Quotation items deleted. Count: ${itemsCount}`);

      // Delete the quotation itself with more specific error handling
      console.log('Deleting quotation...');
      const { error: quotationError, count, data: deletedData } = await supabase
        .from('quotations')
        .delete({ count: 'exact' })
        .eq('id', quotationId)
        .select();

      console.log('Delete result - Count:', count, 'Data:', deletedData, 'Error:', quotationError);

      if (quotationError) {
        console.error('Error deleting quotation:', quotationError);
        throw new Error(`Failed to delete quotation: ${quotationError.message}`);
      }

      // Check if deletion was successful
      if (count === 0) {
        // Try one more time with a direct check
        const { data: stillExists, error: recheckError } = await supabase
          .from('quotations')
          .select('id')
          .eq('id', quotationId)
          .single();

        if (!recheckError && stillExists) {
          console.error('Quotation still exists after deletion attempt');
          throw new Error('Failed to delete quotation - permission denied or constraint violation');
        } else {
          console.log('Quotation appears to be deleted despite count=0');
        }
      } else {
        console.log(`Quotation deleted successfully. Rows affected: ${count}`);
      }

      return quotationId;
    },
    onSuccess: (deletedId) => {
      console.log('Delete operation completed successfully for:', deletedId);
      
      // Clear all related cache data
      queryClient.removeQueries({ queryKey: ['quotations'] });
      queryClient.removeQueries({ queryKey: ['quotation-items'] });
      
      // Refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      
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
