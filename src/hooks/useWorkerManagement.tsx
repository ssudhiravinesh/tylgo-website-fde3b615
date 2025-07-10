
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
      
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Insufficient privileges. Admin access required.');
      }

      // Call Supabase edge function for password reset (admin function)
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword }
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: (error: any) => {
      console.error('Error resetting password:', error);
      if (error.message?.includes('Insufficient privileges')) {
        toast.error('Admin privileges required to reset passwords');
      } else if (error.message?.includes('Function not found')) {
        toast.error('Password reset feature is not yet implemented on the server');
      } else {
        toast.error(error.message || 'Failed to reset password');
      }
    },
  });

  const addWorkerMutation = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      console.log('Creating new worker account:', email);
      
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Insufficient privileges. Admin access required.');
      }

      // Call Supabase edge function for worker creation (admin function)
      const { data, error } = await supabase.functions.invoke('admin-create-worker', {
        body: { name, email, password }
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Worker account created successfully');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: (error: any) => {
      console.error('Error creating worker:', error);
      toast.error(error.message || 'Error creating worker account');
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
    addWorkerMutation,
    fetchWorkerQuotations,
  };
};
