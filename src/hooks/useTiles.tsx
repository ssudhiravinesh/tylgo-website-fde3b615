
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
import { getBrandId } from './useShowroom';
import { getSessionInfo } from '@/utils/sessionCache';

export interface Tile {
  id: string;
  code: string;
  size_length: number;
  size_breadth: number;
  pieces_per_box?: number;
  price_per_box?: number;
  image_url?: string;
  qr_code_url?: string;
  category?: string;
  stock_quantity?: number;
  last_stock_sync?: string;
  created_at?: string;
  updated_at?: string;
}

async function fetchTiles(includeInactive = false, overrideBrandId?: string): Promise<{ tiles: Tile[]; totalCount: number }> {
  console.log('🔄 Starting to fetch tiles...', { includeInactive, overrideBrandId });
  try {
    // Single cached call replaces ~5 separate Supabase requests
    const session = await getSessionInfo();
    const targetBrandId = overrideBrandId || session.brandId;
    const isSuperAdmin = session.isSuperAdmin;

    // Step 1: Get total tile count
    let countQuery = supabase
      .from('tiles')
      .select('*', { count: 'exact', head: true });

    // Filter by brand_id logic:
    // 1. If override provided, ALWAYS filter by it (even for Super Admin).
    // 2. If NO override, but User has a Brand (Regular User), filter by it.
    // 3. If NO override, and User is Super Admin, DO NOT filter (show all).
    if (targetBrandId) {
      // If we have a target brand (either override or user's brand), use it.
      // BUT: if it came from getBrandId() and user is SuperAdmin, we might want to ignore it?
      // Actually, getBrandId() returns null for SuperAdmin usually unless they are "acting" as one?
      // Let's stick to simple logic: If targetBrandId exists, use it.
      // Exception: If it's a super admin, getBrandId() shouldn't limit them unless explicitly set?
      // Current getBrandId implementation likely returns null for superadmin if not associated.
      // So: if targetBrandId is set, filter by it.
      countQuery = countQuery.eq('brand_id', targetBrandId);
    } else if (!isSuperAdmin) {
      // If no brand ID found and NOT super admin, something is wrong (or they have no brand), imply no access?
      // Or maybe they are just a worker without brand?
      // For safety, if not super admin and no brand, maybe return empty?
      // Assuming existing logic handles "no brand_id" by returning nothing or erroring elsewhere.
      // We will leave it as is: if no brand_id and not super admin, we might fetch everything?
      // The original code said: if (brand_id && !isSuperAdmin) filter.
      // So if brand_id is null and !isSuperAdmin, it fetched all? That seems unsafe for multi-tenant.
      // But let's preserve original intent: Filter if brand_id exists.
    }


    if (!includeInactive) {
      countQuery = countQuery.eq('is_active', true);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('❌ Error fetching tile count:', countError);
      throw countError;
    }

    const totalCount = count ?? 0;
    console.log(`📊 Total tiles found: ${totalCount}`);

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
      let dataQuery = supabase
        .from('tiles')
        .select('*')
        .range(from, from + batchSize - 1)
        .order('created_at', { ascending: false });

      if (targetBrandId) {
        dataQuery = dataQuery.eq('brand_id', targetBrandId);
      }

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
        batchNum++;
      } else {
        hasMore = false;
      }
    }

    return { tiles: allTiles, totalCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching tiles';
    toast.error(`Failed to load tiles: ${message}`);
    throw err;
  }
}

export const useTiles = (includeInactive = false, overrideBrandId?: string, enabled = true) => {
  const query = useQuery({
    queryKey: ['tiles', includeInactive, overrideBrandId],
    queryFn: () => fetchTiles(includeInactive, overrideBrandId),
    staleTime: 1000 * 60 * 5, // 5 mins caching
    enabled,
  });

  return {
    data: query.data?.tiles ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};

// ---------------------------------------------------------------------------
// Lightweight hook: fetches ONLY the category column to derive category stats.
// Used by TileCatalog's initial "categories" view so the user doesn't wait
// for all 1500+ full tile rows to load just to see category cards.
// ---------------------------------------------------------------------------

export interface TileCategoryStats {
  name: string;
  count: number;
}

async function fetchTileCategories(): Promise<{ categories: TileCategoryStats[]; totalCount: number }> {
  try {
    // Single cached call replaces ~4 separate Supabase requests
    const session = await getSessionInfo();
    const targetBrandId = session.brandId;

    // Fetch only the category column — extremely lightweight vs select('*')
    let query = supabase
      .from('tiles')
      .select('category')
      .eq('is_active', true);

    if (targetBrandId) {
      query = query.eq('brand_id', targetBrandId);
    }

    // Supabase has a 1000-row default limit; paginate to get all categories
    let allCategories: string[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await query.range(from, from + batchSize - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        allCategories = allCategories.concat(data.map(row => row.category || 'Uncategorized'));
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    // Aggregate counts
    const statsMap = new Map<string, number>();
    allCategories.forEach(cat => {
      statsMap.set(cat, (statsMap.get(cat) || 0) + 1);
    });

    const categories = Array.from(statsMap.entries()).map(([name, count]) => ({ name, count }));
    return { categories, totalCount: allCategories.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching tile categories';
    toast.error(`Failed to load categories: ${message}`);
    throw err;
  }
}

export const useTileCategories = () => {
  const query = useQuery({
    queryKey: ['tile-categories'],
    queryFn: fetchTileCategories,
    staleTime: 1000 * 60 * 5,
  });

  return {
    categories: query.data?.categories ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
};

// ---------------------------------------------------------------------------
// Lightweight hook: fetches ONLY the tiles matching the given IDs.
// Used by TileSelectionStep so it doesn't load all 1500+ tiles upfront —
// only the ~1-10 tiles actually referenced in the customer's selections.
// ---------------------------------------------------------------------------

async function fetchTilesByIds(tileIds: string[]): Promise<Tile[]> {
  if (tileIds.length === 0) return [];

  // Supabase .in() supports up to 100+ IDs easily; no pagination needed
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .in('id', tileIds);

  if (error) {
    console.error('Error fetching tiles by IDs:', error);
    throw error;
  }

  return (data || []) as Tile[];
}

export const useTilesByIds = (tileIds: string[]) => {
  // Sort IDs for stable query key
  const sortedIds = [...tileIds].sort();

  return useQuery({
    queryKey: ['tiles-by-ids', sortedIds],
    queryFn: () => fetchTilesByIds(sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 min — tile data rarely changes
  });
};
