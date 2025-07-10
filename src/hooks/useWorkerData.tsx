import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Worker {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  created_at: string;
  quotation_count?: number;
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

  // Get quotation counts for each worker
  const { data: quotationCounts, error: quotationError } = await supabase
    .from('quotations')
    .select('worker_id')
    .in('worker_id', profiles?.map(p => p.id) || []);

  if (quotationError) {
    console.error('Error fetching quotation counts:', quotationError);
    // Don't throw here, just log the error
  }

  // Count quotations per worker
  const quotationCountMap = quotationCounts?.reduce((acc, quotation) => {
    acc[quotation.worker_id] = (acc[quotation.worker_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Combine profiles with quotation counts
  const workersWithCounts = profiles?.map(profile => ({
    ...profile,
    quotation_count: quotationCountMap[profile.id] || 0,
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