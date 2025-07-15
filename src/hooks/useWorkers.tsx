
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

const fetchWorkers = async (): Promise<Worker[]> => {
  console.log('Fetching workers from database...');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'worker')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workers:', error);
    throw error;
  }

  console.log('Workers fetched:', data?.length || 0);
  return data || [];
};

export const useWorkers = () => {
  return useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });
};
