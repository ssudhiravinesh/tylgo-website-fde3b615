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

export interface QuotationItem {
  tile_id: string;
  room_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateQuotationData {
  customer_id: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total_cost: number;
  notes?: string;
  items: QuotationItem[];
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

const fetchQuotationForEdit = async (quotationId: string) => {
  const { data, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customer:customers(name, mobile),
      quotation_items(
        id,
        tile_id,
        room_id,
        quantity,
        unit_price,
        total_price
      )
    `)
    .eq('id', quotationId)
    .single();

  if (error) {
    console.error('Error fetching quotation for edit:', error);
    throw error;
  }

  return {
    ...data,
    status: data.status as 'draft' | 'sent' | 'approved' | 'rejected'
  };
};

export const useQuotationForEdit = (quotationId: string) => {
  return useQuery({
    queryKey: ['quotation-edit', quotationId],
    queryFn: () => fetchQuotationForEdit(quotationId),
    enabled: !!quotationId,
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
    mutationFn: async (quotationData: CreateQuotationData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Start a Supabase transaction
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([{
          customer_id: quotationData.customer_id,
          status: quotationData.status,
          total_cost: quotationData.total_cost,
          notes: quotationData.notes,
          quotation_number: generateQuotationNumber(),
          worker_id: user.id
        }])
        .select()
        .single();

      if (quotationError) {
        console.error('Error creating quotation:', quotationError);
        throw quotationError;
      }

      // Insert quotation items
      if (quotationData.items.length > 0) {
        const itemsToInsert = quotationData.items.map(item => ({
          quotation_id: quotation.id,
          tile_id: item.tile_id,
          room_id: item.room_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creating quotation items:', itemsError);
          // Clean up the quotation if items failed to insert
          await supabase.from('quotations').delete().eq('id', quotation.id);
          throw itemsError;
        }
      }

      return quotation;
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
    mutationFn: async ({ quotationId, quotationData }: { quotationId: string, quotationData: CreateQuotationData }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update the quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .update({
          customer_id: quotationData.customer_id,
          status: quotationData.status,
          total_cost: quotationData.total_cost,
          notes: quotationData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', quotationId)
        .select()
        .single();

      if (quotationError) {
        console.error('Error updating quotation:', quotationError);
        throw quotationError;
      }

      // Delete existing quotation items
      const { error: deleteError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', quotationId);

      if (deleteError) {
        console.error('Error deleting old quotation items:', deleteError);
        throw deleteError;
      }

      // Insert new quotation items
      if (quotationData.items.length > 0) {
        const itemsToInsert = quotationData.items.map(item => ({
          quotation_id: quotationId,
          tile_id: item.tile_id,
          room_id: item.room_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creating updated quotation items:', itemsError);
          throw itemsError;
        }
      }

      return quotation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-edit'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-details'] });
      toast.success('Quotation updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating quotation:', error);
      toast.error(error.message || 'Error updating quotation');
    },
  });
};
