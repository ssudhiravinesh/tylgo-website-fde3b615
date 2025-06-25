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
    address?: string;
  };
  worker?: {
    name: string;
  };
}

interface DateFilters {
  quickSort?: string;
  year?: number | null;
  month?: number | null;
}

const getDateRange = (quickSort: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  switch (quickSort) {
    case 'current-month': {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
    case 'last-month': {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
    case 'last-2-months': {
      const startDate = new Date(currentYear, currentMonth - 2, 1);
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
    case 'last-year': {
      const startDate = new Date(currentYear - 1, 0, 1);
      const endDate = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
    default:
      return null;
  }
};

const getPreciseDateRange = (year: number | null, month: number | null) => {
  if (!year && !month) return null;
  
  const targetYear = year || new Date().getFullYear();
  
  if (month) {
    // Specific month and year
    const startDate = new Date(targetYear, month - 1, 1);
    const endDate = new Date(targetYear, month, 0, 23, 59, 59, 999);
    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  } else {
    // Entire year
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  }
};

const fetchQuotations = async (filters: DateFilters = {}): Promise<Quotation[]> => {
  let query = supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(name, mobile, address),
      worker:profiles(name)
    `);

  // Apply date filters
  const quickSortRange = filters.quickSort && filters.quickSort !== 'all' 
    ? getDateRange(filters.quickSort) 
    : null;
  
  const preciseRange = getPreciseDateRange(filters.year, filters.month);
  
  // Use either quick sort or precise filter, precise takes priority
  const dateRange = preciseRange || quickSortRange;
  
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

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

export const useQuotations = (filters: DateFilters = {}) => {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn: () => fetchQuotations(filters),
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
      console.log('Starting deletion for quotation:', quotationId);
      
      // Simple deletion - let the database handle foreign key constraints with CASCADE
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId);

      if (error) {
        console.error('Error deleting quotation:', error);
        throw error;
      }

      console.log('Quotation deleted successfully');
      return quotationId;
    },
    onSuccess: (deletedId) => {
      console.log('Delete operation completed successfully for:', deletedId);
      
      // Clear and refetch data
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-items'] });
      
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
