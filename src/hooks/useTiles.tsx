
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

interface UseTilesOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}

// Function to fetch all tiles for search purposes
async function fetchAllTilesForSearch(searchTerm: string): Promise<Tile[]> {
  if (!searchTerm.trim()) return [];
  
  console.log(`🔍 Searching across all tiles for: "${searchTerm}"`);
  
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error searching tiles:', error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} tiles matching search term`);
  return data || [];
}

// Function to fetch paginated tiles
async function fetchPaginatedTiles(page: number, pageSize: number): Promise<{ tiles: Tile[]; totalCount: number }> {
  console.log(`📄 Fetching page ${page} with ${pageSize} tiles per page`);
  
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('tiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error fetching tile count:', countError);
      throw countError;
    }

    const totalCount = count ?? 0;
    console.log(`📊 Total tiles in database: ${totalCount}`);

    // Calculate offset
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Fetch paginated data
    const { data, error } = await supabase
      .from('tiles')
      .select('*')
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching paginated tiles:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} tiles for page ${page}`);
    return { tiles: data || [], totalCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching tiles';
    toast.error(`Failed to load tiles: ${message}`);
    throw err;
  }
}

// Legacy function for backward compatibility - fetches all tiles
async function fetchTiles(): Promise<{ tiles: Tile[]; totalCount: number }> {
  console.log('🔄 Starting to fetch all tiles with pagination...');
  try {
    // Step 1: Get total tile count
    const { count, error: countError } = await supabase
      .from('tiles')
      .select('*', { count: 'exact', head: true });

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
      const { data, error } = await supabase
        .from('tiles')
        .select('*')
        .range(from, from + batchSize - 1)
        .order('created_at', { ascending: false });

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

export const useTiles = (options: UseTilesOptions = {}) => {
  const { page = 1, pageSize = 20, searchTerm = '' } = options;
  
  // If search term exists, search across all tiles
  const searchQuery = useQuery({
    queryKey: ['tiles-search', searchTerm],
    queryFn: () => fetchAllTilesForSearch(searchTerm),
    enabled: !!searchTerm.trim(),
    staleTime: 1000 * 60 * 2, // 2 mins caching for search
    refetchOnWindowFocus: false,
  });

  // For paginated tiles (when no search)
  const paginatedQuery = useQuery({
    queryKey: ['tiles-paginated', page, pageSize],
    queryFn: () => fetchPaginatedTiles(page, pageSize),
    enabled: !searchTerm.trim(),
    staleTime: 1000 * 60 * 5, // 5 mins caching
    refetchOnWindowFocus: false,
  });

  // Return search results if searching, otherwise paginated results
  if (searchTerm.trim()) {
    return {
      data: searchQuery.data ?? [],
      totalCount: searchQuery.data?.length ?? 0,
      isLoading: searchQuery.isLoading,
      error: searchQuery.error,
      refetch: searchQuery.refetch,
      isSearching: true,
    };
  }

  return {
    data: paginatedQuery.data?.tiles ?? [],
    totalCount: paginatedQuery.data?.totalCount ?? 0,
    isLoading: paginatedQuery.isLoading,
    error: paginatedQuery.error,
    refetch: paginatedQuery.refetch,
    isSearching: false,
  };
};

// Legacy hook for components that need all tiles
export const useAllTiles = () => {
  const query = useQuery({
    queryKey: ['tiles-all'],
    queryFn: fetchTiles,
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
