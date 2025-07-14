import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Worker {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  created_at: string;
  quotation_count?: number;
  approved_quotations?: number;
  pending_quotations?: number;
}

export interface QuotationStats {
  totalQuotations: number;
  activeQuotations: number;
  workerStats: Array<{
    worker_id: string;
    worker_name: string;
    quotation_count: number;
  }>;
}

const fetchWorkers = async (): Promise<Worker[]> => {
  console.log('Fetching workers...');
  
  // First get all profiles with role 'worker'
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'worker');

  if (profilesError) {
    console.error('Error fetching worker profiles:', profilesError);
    throw profilesError;
  }

  // Get quotations with status for each worker
  const { data: quotations, error: quotationError } = await supabase
    .from('quotations')
    .select('worker_id, status')
    .in('worker_id', profiles?.map(p => p.id) || []);

  if (quotationError) {
    console.error('Error fetching quotations:', quotationError);
    // Don't throw here, just log the error
  }

  // Count quotations per worker by status
  const quotationStatsMap = quotations?.reduce((acc, quotation) => {
    const workerId = quotation.worker_id;
    
    if (!acc[workerId]) {
      acc[workerId] = {
        total: 0,
        approved: 0,
        pending: 0,
      };
    }
    
    acc[workerId].total += 1;
    
    if (quotation.status === 'approved') {
      acc[workerId].approved += 1;
    } else if (quotation.status === 'pending') {
      acc[workerId].pending += 1;
    }
    
    return acc;
  }, {} as Record<string, { total: number; approved: number; pending: number }>) || {};

  // Combine profiles with quotation counts
  const workersWithCounts = profiles?.map(profile => ({
    ...profile,
    quotation_count: quotationStatsMap[profile.id]?.total || 0,
    approved_quotations: quotationStatsMap[profile.id]?.approved || 0,
    pending_quotations: quotationStatsMap[profile.id]?.pending || 0,
  })) || [];

  console.log('Workers fetched:', workersWithCounts);
  return workersWithCounts;
};

const fetchQuotationStats = async (): Promise<QuotationStats> => {
  console.log('Fetching quotation stats...');
  
  const { data: quotations, error } = await supabase
    .from('quotations')
    .select(`
      id,
      worker_id,
      status,
      worker:profiles(name)
    `);

  if (error) {
    console.error('Error fetching quotation stats:', error);
    throw error;
  }

  const totalQuotations = quotations?.length || 0;
  const activeQuotations = quotations?.filter(q => q.status !== 'rejected')?.length || 0;

  // Group by worker
  const workerStatsMap = quotations?.reduce((acc, quotation) => {
    const workerId = quotation.worker_id;
    const workerName = (quotation.worker as any)?.name || 'Unknown';
    
    if (!acc[workerId]) {
      acc[workerId] = {
        worker_id: workerId,
        worker_name: workerName,
        quotation_count: 0,
      };
    }
    acc[workerId].quotation_count += 1;
    return acc;
  }, {} as Record<string, any>) || {};

  const workerStats = Object.values(workerStatsMap);

  return {
    totalQuotations,
    activeQuotations,
    workerStats,
  };
};

export const useWorkerData = () => {
  const { data: workers, isLoading: workersLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

  const { data: quotationStats, isLoading: statsLoading } = useQuery({
    queryKey: ['quotation-stats'],
    queryFn: fetchQuotationStats,
  });

  return {
    workers,
    quotationStats,
    isLoading: workersLoading || statsLoading,
  };
};
