
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

const fetchTiles = async (): Promise<Tile[]> => {
  console.log('Fetching tiles from database...');
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .order('name', { ascending: true }); // Changed to alphabetical order by name

  if (error) {
    console.error('Error fetching tiles:', error);
    throw error;
  }

  console.log('Tiles fetched:', data?.length || 0);
  return data || [];
};

export const useTiles = () => {
  return useQuery({
    queryKey: ['tiles'],
    queryFn: fetchTiles,
  });
};
