import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerQuotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  worker_id: string;
  total_cost: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  notes: string;
  wastage_percentage: number;
  created_at: string;
  updated_at: string;
  customer: {
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
      
      // Type cast and handle RLS restrictions
      const typedQuotations: WorkerQuotation[] = (data || []).map((quotation: any) => {
        // Handle potential RLS restrictions on customer data
        let customerData;
        if (quotation.customer && typeof quotation.customer === 'object' && !('error' in quotation.customer)) {
          customerData = quotation.customer as { name: string; mobile: string };
        } else {
          customerData = { name: 'Restricted', mobile: 'N/A' };
        }
        
        return {
          id: quotation.id,
          quotation_number: quotation.quotation_number,
          customer_id: quotation.customer_id,
          worker_id: quotation.worker_id || '',
          total_cost: quotation.total_cost || 0,
          status: quotation.status as 'draft' | 'sent' | 'approved' | 'rejected',
          notes: quotation.notes || '',
          wastage_percentage: quotation.wastage_percentage || 0,
          created_at: quotation.created_at,
          updated_at: quotation.updated_at,
          customer: customerData
        };
      });
      
      setWorkerQuotations(typedQuotations);
    } catch (error) {
      console.error('Error fetching worker quotations:', error);
    }
  };

  return { workerQuotations, fetchWorkerQuotations };
};