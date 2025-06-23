
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Tile {
  id: string;
  name: string;
  code: string;
  size_length: number;
  size_breadth: number;
  price_per_sqm: number;
  image_url?: string;
  qr_code_url?: string;
  created_at?: string;
  updated_at?: string;
}

const fetchTiles = async (): Promise<Tile[]> => {
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching tiles:', error);
    throw error;
  }

  return data || [];
};

export const useTiles = () => {
  return useQuery({
    queryKey: ['tiles'],
    queryFn: fetchTiles,
  });
};
