
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { toast } from 'sonner';
// import { supabase } from '@/integrations/supabase/client';

// export interface Tile {
//   id: string;
//   code: string;
//   name: string;
//   size_length: number;
//   size_breadth: number;
//   pieces_per_box?: number;
//   price_per_box?: number;
//   image_url?: string;
//   qr_code_url?: string;
//   category?: string;
//   created_at?: string;
//   updated_at?: string;
// }

// //2.0
// const fetchTiles = async (): Promise<Tile[]> => {
//   console.log('Fetching all tiles from database...');
  
//   let allTiles: Tile[] = [];
//   let from = 0;
//   const limit = 1000; // Supabase's safe batch size
//   let hasMoreData = true;

//   while (hasMoreData) {
//     const { data, error } = await supabase
//       .from('tiles')
//       .select('*')
//       .range(from, from + limit - 1)
//       .order('created_at', { ascending: false });

//     if (error) {
//       console.error('Error fetching tiles:', error);
//       throw error;
//     }

//     if (data && data.length > 0) {
//       allTiles = [...allTiles, ...data];
//       from += limit;
//       hasMoreData = data.length === limit; // Continue if we got a full batch
//     } else {
//       hasMoreData = false;
//     }
//   }

//   console.log('Total tiles fetched:', allTiles.length);
//   return allTiles;
// };

// export const useTiles = () => {
//   return useQuery({
//     queryKey: ['tiles'],
//     queryFn: fetchTiles,
//   });
// };


// src/hooks/useTiles.tsx
import { useQuery } from '@tanstack/react-query';
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

async function fetchTiles(includeInactive = false): Promise<{ tiles: Tile[]; totalCount: number }> {
  console.log('🔄 Starting to fetch all tiles with pagination...', includeInactive ? '(including inactive)' : '(active only)');
  try {
    // Step 1: Get total tile count
    let countQuery = supabase
      .from('tiles')
      .select('*', { count: 'exact', head: true });
    
    if (!includeInactive) {
      countQuery = countQuery.eq('is_active', true);
    }
    
    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('❌ Error fetching tile count:', countError);
      throw countError;
    }

    const totalCount = count ?? 0;
    console.log(`📊 Total tiles in database: ${totalCount}`);

    if (totalCount === 0) {
      return { tiles: [], totalCount };
    }

    // Step 2: Fetch tiles paginated in batches
    const batchSize = 1000;
    let allTiles: Tile[] = [];
    let from = 0;
    let hasMore = true;
    let batchNum = 1;

    while (hasMore) {
      console.log(`📦 Fetching batch ${batchNum} (rows ${from} to ${from + batchSize - 1})`);
      let dataQuery = supabase
        .from('tiles')
        .select('*')
        .range(from, from + batchSize - 1)
        .order('created_at', { ascending: false });
      
      if (!includeInactive) {
        dataQuery = dataQuery.eq('is_active', true);
      }
      
      const { data, error } = await dataQuery;

      if (error) {
        console.error(`❌ Error fetching batch ${batchNum}:`, error);
        throw error;
      }

      if (data && data.length > 0) {
        allTiles = [...allTiles, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
        console.log(`✅ Batch ${batchNum} fetched ${data.length} tiles, total so far: ${allTiles.length}`);
        batchNum++;

        // Optional: small delay after second batch (if large dataset)
        if (hasMore && batchNum > 2) {
          await new Promise((r) => setTimeout(r, 100));
        }
      } else {
        hasMore = false;
        console.log(`🛑 No more data in batch ${batchNum}, stopping.`);
      }
    }

    if (allTiles.length !== totalCount) {
      console.warn(`⚠️ Tile count mismatch: fetched ${allTiles.length} vs total ${totalCount}`);
    } else {
      console.log('✨ All tiles fetched successfully, count matches total count.');
    }

    return { tiles: allTiles, totalCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching tiles';
    toast.error(`Failed to load tiles: ${message}`);
    throw err;
  }
}

export const useTiles = (includeInactive = false) => {
  const query = useQuery({
    queryKey: ['tiles', includeInactive],
    queryFn: () => fetchTiles(includeInactive),
    staleTime: 1000 * 60 * 5, // 5 mins caching
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data?.tiles ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
