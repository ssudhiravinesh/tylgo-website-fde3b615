
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Tile {
  id: string;
  code: string;
  name: string;
  size_length: number;
  size_breadth: number;
  price_per_sqm: number;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export const useTiles = () => {
  return useQuery({
    queryKey: ['tiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Error loading tiles');
        throw error;
      }

      return data as Tile[];
    },
  });
};

export const useCreateTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileData: Omit<Tile, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tiles')
        .insert([tileData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error creating tile');
    },
  });
};

export const useUpdateTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Tile> & { id: string }) => {
      const { data, error } = await supabase
        .from('tiles')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error updating tile');
    },
  });
};

export const useDeleteTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileId: string) => {
      const { error } = await supabase
        .from('tiles')
        .delete()
        .eq('id', tileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error deleting tile');
    },
  });
};
