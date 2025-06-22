
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
