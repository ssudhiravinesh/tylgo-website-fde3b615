
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface Tile {
  id: string;
  code: string;
  name: string;
  size_length: number;
  size_breadth: number;
  pieces_per_box?: number;
  price_per_box?: number;
  image_url?: string;
  qr_code_url?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

//2.0
const fetchTiles = async (): Promise<Tile[]> => {
  console.log('Fetching all tiles from database...');
  
  let allTiles: Tile[] = [];
  let from = 0;
  const limit = 1000; // Supabase's safe batch size
  let hasMoreData = true;

  while (hasMoreData) {
    const { data, error } = await supabase
      .from('tiles')
      .select('*')
      .range(from, from + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tiles:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allTiles = [...allTiles, ...data];
      from += limit;
      hasMoreData = data.length === limit; // Continue if we got a full batch
    } else {
      hasMoreData = false;
    }
  }

  console.log('Total tiles fetched:', allTiles.length);
  return allTiles;
};

export const useTiles = () => {
  return useQuery({
    queryKey: ['tiles'],
    queryFn: fetchTiles,
  });
};
