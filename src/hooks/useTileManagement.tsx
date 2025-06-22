
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tile } from './useTiles';

export const useCreateTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileData: Omit<Tile, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating tile with data:', tileData);
      
      const { data, error } = await supabase
        .from('tiles')
        .insert([tileData])
        .select()
        .single();

      if (error) {
        console.error('Error creating tile:', error);
        throw error;
      }

      console.log('Tile created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Tile creation mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile created successfully');
    },
    onError: (error: any) => {
      console.error('Tile creation mutation failed:', error);
      if (error.code === '23505' && error.message.includes('tiles_code_key')) {
        toast.error('A tile with this code already exists');
      } else {
        toast.error(error.message || 'Error creating tile');
      }
    },
  });
};

export const useUpdateTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: Partial<Tile> & { id: string }) => {
      const { id, ...updates } = updateData;
      console.log('Updating tile:', id, 'with data:', updates);
      
      const { data, error } = await supabase
        .from('tiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating tile:', error);
        throw error;
      }

      console.log('Tile updated successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Tile update mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile updated successfully');
    },
    onError: (error: any) => {
      console.error('Tile update mutation failed:', error);
      if (error.code === '23505' && error.message.includes('tiles_code_key')) {
        toast.error('A tile with this code already exists');
      } else {
        toast.error(error.message || 'Error updating tile');
      }
    },
  });
};

export const useDeleteTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileId: string) => {
      console.log('Deleting tile:', tileId);
      
      const { error } = await supabase
        .from('tiles')
        .delete()
        .eq('id', tileId);

      if (error) {
        console.error('Error deleting tile:', error);
        throw error;
      }

      console.log('Tile deleted successfully');
    },
    onSuccess: () => {
      console.log('Tile deletion mutation succeeded');
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile deleted successfully');
    },
    onError: (error: any) => {
      console.error('Tile deletion mutation failed:', error);
      if (error.code === '23503') {
        toast.error('Cannot delete tile: it is being used in quotations');
      } else {
        toast.error(error.message || 'Error deleting tile');
      }
    },
  });
};
