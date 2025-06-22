
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Worker {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  created_at: string;
  quotation_count?: number;
}

interface WorkerQuotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total_cost: number;
  notes?: string;
  created_at: string;
  customer?: {
    name: string;
    mobile: string;
  };
}

interface QuotationStats {
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

export const useWorkerManagement = () => {
  const [workerQuotations, setWorkerQuotations] = useState<WorkerQuotation[]>([]);
  const queryClient = useQueryClient();

  const { data: workers, isLoading: workersLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

  const { data: quotationStats, isLoading: statsLoading } = useQuery({
    queryKey: ['quotation-stats'],
    queryFn: fetchQuotationStats,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      console.log('Resetting password for user:', userId);
      
      // In a real application, you would need to use Supabase Admin API
      // For now, we'll simulate the password reset
      // This would typically require server-side code with admin privileges
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, you would make a call to a server endpoint that uses
      // the Supabase Admin SDK to update the user's password
      throw new Error('Password reset functionality requires server-side implementation with Supabase Admin SDK');
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: (error: any) => {
      console.error('Error resetting password:', error);
      toast.error('Password reset functionality is not fully implemented yet. This requires server-side admin privileges.');
    },
  });

  const fetchWorkerQuotations = async (workerId: string) => {
    console.log('Fetching quotations for worker:', workerId);
    
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          customer:customers(name, mobile)
        `)
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching worker quotations:', error);
        throw error;
      }

      console.log('Worker quotations fetched:', data);
      
      // Type cast the status field to match our interface
      const typedQuotations: WorkerQuotation[] = (data || []).map(quotation => ({
        ...quotation,
        status: quotation.status as 'draft' | 'sent' | 'approved' | 'rejected'
      }));
      
      setWorkerQuotations(typedQuotations);
    } catch (error) {
      console.error('Error fetching worker quotations:', error);
      toast.error('Error fetching quotations');
    }
  };

  return {
    workers,
    workerQuotations,
    quotationStats,
    isLoading: workersLoading || statsLoading,
    resetPasswordMutation,
    fetchWorkerQuotations,
  };
};
