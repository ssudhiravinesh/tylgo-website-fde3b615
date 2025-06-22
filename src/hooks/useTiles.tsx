
import { useQuery } from '@tanstack/react-query';
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
