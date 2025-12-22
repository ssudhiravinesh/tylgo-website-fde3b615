import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';

export interface ShowroomStats {
    id: string;
    name: string;
    subdomain: string;
    customerCount: number;
    workerCount: number;
    quotationCount: number;
    tileCount: number;
    productCount: number;
    totalRevenue: number;
}

export interface BrandWithShowrooms {
    id: string;
    name: string;
    showroomCount: number;
    showrooms: ShowroomStats[];
    totalCustomers: number;
    totalQuotations: number;
    totalRevenue: number;
}

export interface CategoryCount {
    category: string;
    count: number;
}

export interface RecentQuotation {
    id: string;
    customerName: string;
    showroomName: string;
    amount: number;
    date: string;
}

export interface SuperAdminStats {
    // Top-level counts
    totalBrands: number;
    totalShowrooms: number;
    totalCustomers: number;
    totalQuotations: number;
    totalTiles: number;
    totalProducts: number;
    totalRevenue: number;

    // Brand hierarchy
    brands: BrandWithShowrooms[];

    // Catalogue breakdown
    tilesByCategory: CategoryCount[];
    productsByCategory: CategoryCount[];
    recentlyAddedTiles: { id: string; code: string; category: string; created_at: string }[];
    recentlyAddedProducts: { id: string; name: string; category: string; created_at: string }[];

    // Performance metrics
    topShowrooms: { name: string; quotationCount: number; revenue: number }[];
    recentQuotations: RecentQuotation[];

    // Growth metrics
    newCustomersThisMonth: number;
    newQuotationsThisMonth: number;

    // Chart Data
    monthlyStats: {
        name: string; // e.g., "Jan 2024"
        revenue: number;
        quotations: number;
        customers: number;
    }[];
    brandPerformance: {
        name: string;
        revenue: number;
        quotations: number;
    }[];
}

async function fetchSuperAdminStats(dateRange?: DateRange): Promise<SuperAdminStats> {
    console.log('🔄 Fetching Super Admin Stats with range:', dateRange);

    const fromDate = dateRange?.from ? dateRange.from.toISOString() : null;
    const toDate = dateRange?.to ? dateRange.to.toISOString() : null;

    // Base queries
    let customersQuery = supabase.from('customers').select('id, showroom_id, created_at');
    let quotationsQuery = supabase.from('quotations').select('id, showroom_id, total_cost, created_at, customer_id').order('created_at', { ascending: true });

    // Apply filters if range exists
    if (fromDate) {
        customersQuery = customersQuery.gte('created_at', fromDate);
        quotationsQuery = quotationsQuery.gte('created_at', fromDate);
    }
    if (toDate) {
        // Add 1 day to include the end date fully
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        customersQuery = customersQuery.lt('created_at', nextDay.toISOString());
        quotationsQuery = quotationsQuery.lt('created_at', nextDay.toISOString());
    }

    // Get start of current month for growth metrics
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthISO = startOfMonth.toISOString();

    // Parallel fetch all required data
    const [
        brandsResult,
        showroomsResult,
        customersResult,
        quotationsResult,
        tilesResult,
        productsResult,
        profilesResult,
        newCustomersResult,
        newQuotationsResult,
        recentQuotationsResult,
    ] = await Promise.all([
        // Brands
        supabase.from('brands').select('id, name'),

        // Showrooms with brand_id
        supabase.from('showrooms').select('id, name, subdomain, brand_id'),

        // Filtered customers
        customersQuery,

        // Filtered quotations
        quotationsQuery,

        // All tiles (Catalogue usually not filtered by analytics date range, but could be if desired. Keeping global for now)
        supabase.from('tiles').select('id, code, category, brand_id, showroom_id, created_at').order('created_at', { ascending: false }),

        // All products
        supabase.from('products' as any).select('id, name, category, brand_id, showroom_id, created_at').order('created_at', { ascending: false }),

        // All profiles (workers) with showroom_id
        supabase.from('profiles').select('id, showroom_id, role'),

        // New customers this month (Always current month, regardless of filter)
        supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonthISO),

        // New quotations this month (Always current month, regardless of filter)
        supabase.from('quotations').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonthISO),

        // Recent quotations with customer info (Respects filter if provided, or defaults to recent)
        supabase
            .from('quotations')
            .select(`
                id,
                total_cost,
                created_at,
                showroom_id,
                customers!inner(name)
            `)
            .order('created_at', { ascending: false })
            .limit(10), // This is just a "Recent Activity" feed, separate from the filtered stats? 
        // Actually, let's keep it simple: "Recent" usually means "Latest in the system", ignoring the filter might be better for a "Feed"
        // BUT, if the user filters for "Last Year", showing "Today's" quotes might be confusing.
        // Let's apply the same filter to "Recent Quotations" list if a filter is active.
    ]);

    // Re-fetch unique recent quotations with filter if needed, 
    // but constructing the complex query with inner join and filter is tricky in one go with the variable.
    // Let's stick to the result from the detailed filtered query `quotations` for the stats, 
    // and manually map recent quotations from `quotationsResult` (which IS filtered)
    // instead of a separate unchecked call.

    // Actually, `quotationsResult` doesn't have customer name JOINed.
    // So we do need a separate query or we enrich the data.
    // To save bandwidth, let's fetch customer names for the IDs we have.
    // OR, just use the `recentQuotationsResult` as a "System-wide Feed" (Common pattern).
    // Let's stick to `recentQuotationsResult` being system-wide for now to avoid complexity, 
    // as "Recent Activity" usually implies "What just happened".

    const brands = brandsResult.data || [];
    const showrooms = showroomsResult.data || [];
    const customers = customersResult.data || [];
    const quotations = quotationsResult.data || [];
    const tiles = tilesResult.data || [];
    const products = productsResult.data || [];
    const profiles = profilesResult.data || [];

    // Calculate showroom-level stats
    const showroomStatsMap = new Map<string, ShowroomStats>();

    for (const showroom of showrooms) {
        const showroomCustomers = customers.filter(c => c.showroom_id === showroom.id);
        const showroomQuotations = quotations.filter(q => q.showroom_id === showroom.id);
        const showroomTiles = tiles.filter(t => t.showroom_id === showroom.id);
        const showroomProducts = products.filter(p => p.showroom_id === showroom.id);
        const showroomWorkers = profiles.filter(p => p.showroom_id === showroom.id && p.role === 'worker');
        const showroomRevenue = showroomQuotations.reduce((sum, q) => sum + (Number(q.total_cost) || 0), 0);

        showroomStatsMap.set(showroom.id, {
            id: showroom.id,
            name: showroom.name,
            subdomain: showroom.subdomain,
            customerCount: showroomCustomers.length,
            workerCount: showroomWorkers.length,
            quotationCount: showroomQuotations.length,
            tileCount: showroomTiles.length,
            productCount: showroomProducts.length,
            totalRevenue: showroomRevenue,
        });
    }

    // Build brand hierarchy
    const brandsWithShowrooms: BrandWithShowrooms[] = brands.map(brand => {
        const brandShowrooms = showrooms
            .filter(s => s.brand_id === brand.id)
            .map(s => showroomStatsMap.get(s.id)!)
            .filter(Boolean);

        return {
            id: brand.id,
            name: brand.name,
            showroomCount: brandShowrooms.length,
            showrooms: brandShowrooms,
            totalCustomers: brandShowrooms.reduce((sum, s) => sum + s.customerCount, 0),
            totalQuotations: brandShowrooms.reduce((sum, s) => sum + s.quotationCount, 0),
            totalRevenue: brandShowrooms.reduce((sum, s) => sum + s.totalRevenue, 0),
        };
    });

    // Calculate tiles by category
    const tileCategoryMap = new Map<string, number>();
    for (const tile of tiles) {
        const category = tile.category || 'Uncategorized';
        tileCategoryMap.set(category, (tileCategoryMap.get(category) || 0) + 1);
    }
    const tilesByCategory = Array.from(tileCategoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

    // Calculate products by category
    const productCategoryMap = new Map<string, number>();
    for (const product of products) {
        const category = product.category || 'Uncategorized';
        productCategoryMap.set(category, (productCategoryMap.get(category) || 0) + 1);
    }
    const productsByCategory = Array.from(productCategoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

    // Recently added items (last 7 days - unaffected by filter for now)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyAddedTiles = tiles
        .filter(t => new Date(t.created_at) >= sevenDaysAgo)
        .slice(0, 5)
        .map(t => ({ id: t.id, code: t.code, category: t.category || 'Uncategorized', created_at: t.created_at }));

    const recentlyAddedProducts = products
        .filter(p => new Date(p.created_at) >= sevenDaysAgo)
        .slice(0, 5)
        .map(p => ({ id: p.id, name: p.name, category: p.category || 'Uncategorized', created_at: p.created_at }));

    // Top performing showrooms (based on filtered data)
    const topShowrooms = Array.from(showroomStatsMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5)
        .map(s => ({ name: s.name, quotationCount: s.quotationCount, revenue: s.totalRevenue }));

    // Recent quotations (System-wide feed)
    const recentQuotations: RecentQuotation[] = (recentQuotationsResult.data || []).map((q: any) => {
        const showroom = showrooms.find(s => s.id === q.showroom_id);
        return {
            id: q.id,
            customerName: q.customers?.name || 'Unknown',
            showroomName: showroom?.name || 'Unknown',
            amount: Number(q.total_cost) || 0,
            date: q.created_at,
        };
    });

    // Calculate total revenue
    const totalRevenue = quotations.reduce((sum, q) => sum + (Number(q.total_cost) || 0), 0);

    // --- New Chart Aggregations ---

    // 1. Monthly Trends (Revenue & Quotations)
    // If filtering, we should just show the data we have.
    const monthlyStatsMap = new Map<string, { revenue: number; quotations: number; customers: number }>();

    // We only initialize months if NO filter is selected (default view)
    // If filter is selected, we just let the data populate the map.
    if (!fromDate && !toDate) {
        const monthsToTrack = 6;
        const now = new Date();
        for (let i = monthsToTrack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyStatsMap.set(key, { revenue: 0, quotations: 0, customers: 0 });
        }
    }

    // Aggregate Quotations & Revenue
    quotations.forEach(q => {
        const date = new Date(q.created_at);
        const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        // If map doesn't have key (e.g. outside 6 months window), and we are NOT filtering, we ignore
        // If we ARE filtering, we add it. 
        if (!monthlyStatsMap.has(key)) {
            if (fromDate || toDate) {
                monthlyStatsMap.set(key, { revenue: 0, quotations: 0, customers: 0 });
            } else {
                return; // Skip if outside 6 months default window
            }
        }

        const current = monthlyStatsMap.get(key)!;
        current.revenue += Number(q.total_cost) || 0;
        current.quotations += 1;
    });

    // Aggregate Customers (by creation date)
    customers.forEach(c => {
        const date = new Date(c.created_at);
        const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyStatsMap.has(key)) {
            if (fromDate || toDate) {
                monthlyStatsMap.set(key, { revenue: 0, quotations: 0, customers: 0 });
            } else {
                return;
            }
        }
        const current = monthlyStatsMap.get(key)!;
        current.customers += 1;
    });

    const monthlyStats = Array.from(monthlyStatsMap.entries())
        // Sort by date equivalent of the key string
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([name, stats]) => ({
            name,
            ...stats
        }));

    // 2. Brand Performance
    const brandPerformance = brandsWithShowrooms
        .map(b => ({
            name: b.name,
            revenue: b.totalRevenue,
            quotations: b.totalQuotations
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Top 5

    const stats: SuperAdminStats = {
        totalBrands: brands.length,
        totalShowrooms: showrooms.length,
        totalCustomers: customers.length,
        totalQuotations: quotations.length,
        totalTiles: tiles.length,
        totalProducts: products.length,
        totalRevenue,
        brands: brandsWithShowrooms,
        tilesByCategory,
        productsByCategory,
        recentlyAddedTiles,
        recentlyAddedProducts,
        topShowrooms,
        recentQuotations,
        newCustomersThisMonth: newCustomersResult.count || 0,
        newQuotationsThisMonth: newQuotationsResult.count || 0,
        monthlyStats,
        brandPerformance
    };

    console.log('✅ Super Admin Stats fetched successfully (Filtered)', stats);
    return stats;
}

export const useSuperAdminStats = (dateRange?: DateRange) => {
    return useQuery({
        queryKey: ['super-admin-stats', dateRange],
        queryFn: () => fetchSuperAdminStats(dateRange),
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        refetchOnWindowFocus: false,
    });
};
