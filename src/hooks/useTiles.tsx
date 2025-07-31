
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

const fetchTiles = async (searchTerm?: string): Promise<Tile[]> => {
  // Only fetch tiles if there's a search term with at least 2 characters
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  console.log('Fetching tiles from database with search term:', searchTerm);
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
    .order('code', { ascending: true })
    .limit(1000); // Limit results to prevent large fetches

  if (error) {
    console.error('Error fetching tiles:', error);
    throw error;
  }

  console.log('Tiles fetched:', data?.length || 0);
  return data || [];
};

export const useTiles = (searchTerm?: string) => {
  return useQuery({
    queryKey: ['tiles', searchTerm],
    queryFn: () => fetchTiles(searchTerm),
    enabled: !searchTerm || searchTerm.trim().length >= 2, // Only run query if search term has 2+ characters
  });
};
