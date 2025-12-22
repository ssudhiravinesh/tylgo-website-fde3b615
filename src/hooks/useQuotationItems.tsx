import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getShowroomId } from './useShowroom';

export interface QuotationItem {
  id: string;
  quotation_id: string;
  room_id?: string | null;
  tile_id?: string; // Made optional as products might not have tile_id
  product_id?: string | null; // Added product_id
  area: number;
  price_per_box: number;
  total_price: number;
  layer_number?: number;
  custom_boxes?: number;
  staircase_id?: string;
  quantity?: number;
  tile_type?: string;
  created_at: string;
  // Joined data
  room?: {
    name: string;
    length: number;
    width: number;
    unit: string;
    measurements?: any[]; // Added measurements
  };
  staircase?: {
    name: string;
    number_of_steps: number;
    number_of_risers: number;
  };
  tile?: {
    code: string;
    price_per_box?: number;
    pieces_per_box?: number;
    size_length: number;
    size_breadth: number;
    image_url?: string; // Added image_url
  };
  product?: { // Added product
    id: string; // Added id
    name: string;
    code?: string;
    image_url?: string;
    price?: number;
  };
}

const fetchQuotationItems = async (quotationId: string): Promise<QuotationItem[]> => {
  const { data, error } = await supabase
    .from('quotation_items')
    .select(`
      *,
      rooms!quotation_items_room_id_fkey(name, length, width, unit, measurements),
      staircases!quotation_items_staircase_id_fkey(name, number_of_steps, number_of_risers),
      tiles!quotation_items_tile_id_fkey(name, code, price_per_box, pieces_per_box, size_length, size_breadth, image_url),
      products:product_id(*)
    `) // Attempting to fetch products if the relation exists
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching quotation items:', error);
    throw error;
  }

  // Map the data to the expected structure
  const validData: QuotationItem[] = (data || []).map((item: any) => {
    // Extract room data from the joined rooms table
    const roomData = item.rooms ? {
      name: item.rooms.name || 'Unknown Room',
      length: item.rooms.length || 0,
      width: item.rooms.width || 0,
      unit: item.rooms.unit || 'metre',
      measurements: item.rooms.measurements || [] // Map measurements
    } : undefined;

    // Extract staircase data
    const staircaseData = item.staircases ? {
      name: item.staircases.name || 'Unknown Staircase',
      number_of_steps: item.staircases.number_of_steps || 0,
      number_of_risers: item.staircases.number_of_risers || 0
    } : undefined;

    // Extract tile data from the joined tiles table
    const tileData = item.tiles ? {
      code: item.tiles.code || 'N/A',
      price_per_box: item.tiles.price_per_box || 0,
      pieces_per_box: item.tiles.pieces_per_box || 0,
      size_length: item.tiles.size_length || 0,
      size_breadth: item.tiles.size_breadth || 0,
      image_url: item.tiles.image_url
    } : undefined;

    // Extract product data
    const productData = item.products ? {
      id: item.products.id,
      name: item.products.name,
      code: item.products.code,
      image_url: item.products.image_url,
      price: item.products.price
    } : undefined;

    return {
      id: item.id,
      quotation_id: item.quotation_id,
      room_id: item.room_id,
      staircase_id: item.staircase_id,
      tile_id: item.tile_id,
      product_id: item.product_id,
      area: item.area,
      quantity: item.quantity,
      tile_type: item.tile_type,
      price_per_box: item.price_per_box,
      total_price: item.total_price,
      layer_number: item.layer_number,
      custom_boxes: item.custom_boxes,
      created_at: item.created_at,
      room: roomData,
      staircase: staircaseData,
      tile: tileData,
      product: productData
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
      // Get showroom_id
      const showroom_id = await getShowroomId();
      if (!showroom_id) {
        throw new Error('No showroom assigned to user');
      }

      const { data, error } = await supabase
        .from('quotation_items')
        .insert([{ ...itemData, showroom_id } as any])
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
