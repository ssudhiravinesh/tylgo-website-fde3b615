
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Room {
  id: string;
  name: string;
  customer_id?: string;
  unit?: 'metre' | 'inches' | 'mm';
  length?: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at?: string;
  customer?: {
    id: string;
    name: string;
  };
}

const fetchRooms = async (): Promise<Room[]> => {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      customers!rooms_customer_id_fkey (
        id,
        name
      )
    `)
    .order('name');

  if (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }

  return (data || []).map(room => ({
    ...room,
    customer: room.customers ? {
      id: room.customers.id,
      name: room.customers.name
    } : undefined
  }));
};

const createRoom = async (roomData: { 
  name: string; 
  customer_id?: string;
  unit?: 'metre' | 'inches' | 'mm';
  length?: number;
  width?: number;
  height?: number;
}): Promise<Room> => {
  const { data, error } = await supabase
    .from('rooms')
    .insert([roomData])
    .select(`
      *,
      customers!rooms_customer_id_fkey (
        id,
        name
      )
    `)
    .single();

  if (error) {
    console.error('Error creating room:', error);
    throw error;
  }

  return {
    ...data,
    customer: data.customers ? {
      id: data.customers.id,
      name: data.customers.name
    } : undefined
  };
};

const updateRoom = async (roomData: { 
  id: string;
  name: string; 
  customer_id?: string;
  unit?: 'metre' | 'inches' | 'mm';
  length?: number;
  width?: number;
  height?: number;
}): Promise<Room> => {
  const { id, ...updates } = roomData;
  
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      customers!rooms_customer_id_fkey (
        id,
        name
      )
    `)
    .single();

  if (error) {
    console.error('Error updating room:', error);
    throw error;
  }

  return {
    ...data,
    customer: data.customers ? {
      id: data.customers.id,
      name: data.customers.name
    } : undefined
  };
};

const deleteRoom = async (roomId: string): Promise<void> => {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
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

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};
