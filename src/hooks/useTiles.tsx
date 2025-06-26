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
  price_per_sqm: number;
  image_url?: string;
  qr_code_url?: string;
  created_at?: string;
  updated_at?: string;
}

const fetchTiles = async (): Promise<Tile[]> => {
  console.log('Fetching tiles from database...');
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tiles:', error);
    throw error;
  }

  // Transform data to include price_per_sqm calculation
  const transformedData = (data || []).map(tile => {
    const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
    const price_per_sqm = tile.price_per_box && tile.pieces_per_box 
      ? tile.price_per_box / (tileAreaSqm * tile.pieces_per_box)
      : 0;
    
    return {
      ...tile,
      price_per_sqm
    };
  });

  console.log('Tiles fetched:', transformedData?.length || 0);
  return transformedData;
};

export const useTiles = () => {
  return useQuery({
    queryKey: ['tiles'],
    queryFn: fetchTiles,
  });
};
