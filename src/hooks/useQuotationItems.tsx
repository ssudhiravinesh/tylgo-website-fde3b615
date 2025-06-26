import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface QuotationItem {
  id: string;
  quotation_id: string;
  room_id: string;
  tile_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  // Joined data
  room?: {
    name: string;
    length: number;
    width: number;
    unit: string;
  };
  tile?: {
    name: string;
    code: string;
    price_per_sqm: number;
    price_per_box?: number;
    pieces_per_box?: number;
  };
}

const fetchQuotationItems = async (quotationId: string): Promise<QuotationItem[]> => {
  const { data, error } = await supabase
    .from('quotation_items')
    .select(`
      *,
      room:rooms(name, length, width, unit),
      tile:tiles(name, code, price_per_box, pieces_per_box)
    `)
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching quotation items:', error);
    throw error;
  }

  // Transform the data to include price_per_sqm calculation
  const transformedData = (data || []).map(item => ({
    ...item,
    tile: item.tile ? {
      ...item.tile,
      price_per_sqm: item.tile.price_per_box && item.tile.pieces_per_box 
        ? (item.tile.price_per_box / item.tile.pieces_per_box) * 92903.04 / 1000000 // Convert to price per sqm
        : 0
    } : undefined
  }));

  return transformedData;
};

export const useQuotationItems = (quotationId: string) => {
  return useQuery({
    queryKey: ['quotation-items', quotationId],
    queryFn: () => fetchQuotationItems(quotationId),
    enabled: !!quotationId,
  });
};

export const useCreateQuotationItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: Omit<QuotationItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('quotation_items')
        .insert([itemData])
        .select()
        .single();

      if (error) {
        console.error('Error creating quotation item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotation-items', data.quotation_id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Item added to quotation');
    },
    onError: (error: any) => {
      console.error('Error creating quotation item:', error);
      toast.error(error.message || 'Error adding item to quotation');
    },
  });
};

export const useUpdateQuotationItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: Partial<QuotationItem> & { id: string }) => {
      const { id, ...updates } = updateData;
      
      const { data, error } = await supabase
        .from('quotation_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating quotation item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotation-items', data.quotation_id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation item updated');
    },
    onError: (error: any) => {
      console.error('Error updating quotation item:', error);
      toast.error(error.message || 'Error updating quotation item');
    },
  });
};

export const useDeleteQuotationItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quotationId }: { id: string; quotationId: string }) => {
      const { error } = await supabase
        .from('quotation_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting quotation item:', error);
        throw error;
      }

      return { quotationId };
    },
    onSuccess: ({ quotationId }) => {
      queryClient.invalidateQueries({ queryKey: ['quotation-items', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Item removed from quotation');
    },
    onError: (error: any) => {
      console.error('Error deleting quotation item:', error);
      toast.error(error.message || 'Error removing item from quotation');
    },
  });
};
