import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerQuotation {
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

export const useWorkerQuotations = () => {
  const [workerQuotations, setWorkerQuotations] = useState<WorkerQuotation[]>([]);

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
    workerQuotations,
    fetchWorkerQuotations,
  };
};