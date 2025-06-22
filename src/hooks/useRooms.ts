
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Room {
  id: string;
  name: string;
  created_at: string;
}

const fetchRooms = async (): Promise<Room[]> => {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }

  return data || [];
};

const createRoom = async ({ name }: { name: string }): Promise<Room> => {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error('Error creating room:', error);
    throw error;
  }

  return data;
};

export const useRooms = () => {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};
