import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface QuotationItem {
  id: string;
  quotation_id: string;
  room_id: string;
  tile_id: string;
  area: number;
  price_per_box: number;
  total_price: number;
  layer_number?: number;
  custom_boxes?: number;
  created_at: string;
  // Joined data
  room: {
    name: string;
    length: number;
    width: number;
    unit: string;
  };
  tile: {
    name: string;
    code: string;
    price_per_box?: number;
    pieces_per_box?: number;
    size_length: number;
    size_breadth: number;
  };
}

const fetchQuotationItems = async (quotationId: string): Promise<QuotationItem[]> => {
  const { data, error } = await supabase
    .from('quotation_items')
    .select(`
      *,
      room:rooms(name, length, width, unit),
      tile:tiles(name, code, price_per_box, pieces_per_box, size_length, size_breadth)
    `)
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching quotation items:', error);
    throw error;
  }

  // Filter out items with RLS access errors and provide fallback data
  const validData: QuotationItem[] = (data || []).map((item: any) => {
    // Handle potential RLS restrictions on room data
    let roomData;
    if (item.room && typeof item.room === 'object' && !('error' in item.room)) {
      roomData = item.room as { name: string; length: number; width: number; unit: string };
    } else {
      roomData = { name: 'Restricted', length: 0, width: 0, unit: 'metre' };
    }

    // Handle potential RLS restrictions on tile data
    let tileData;
    if (item.tile && typeof item.tile === 'object' && !('error' in item.tile)) {
      tileData = item.tile as { name: string; code: string; price_per_box?: number; pieces_per_box?: number; size_length: number; size_breadth: number };
    } else {
      tileData = { 
        name: 'Restricted', 
        code: 'N/A', 
        price_per_box: 0, 
        pieces_per_box: 0, 
        size_length: 0, 
        size_breadth: 0 
      };
    }
    
    return {
      id: item.id,
      quotation_id: item.quotation_id,
      room_id: item.room_id,
      tile_id: item.tile_id,
      area: item.area,
      price_per_box: item.price_per_box,
      total_price: item.total_price,
      layer_number: item.layer_number,
      custom_boxes: item.custom_boxes,
      created_at: item.created_at,
      room: roomData,
      tile: tileData
    };
  });

  return validData;
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
    mutationFn: async (itemData: Omit<QuotationItem, 'id' | 'created_at' | 'room' | 'tile'>) => {
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
      const { id, room, tile, ...updates } = updateData;
      
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
