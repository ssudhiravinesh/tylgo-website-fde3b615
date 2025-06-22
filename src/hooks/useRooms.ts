
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Room {
  id: string;
  name: string;
  customer_id: string;
  length: number;
  width: number;
  height: number;
  unit: 'metre' | 'inches' | 'mm';
  created_at: string;
}

export interface CreateRoomData {
  name: string;
  customer_id: string;
  length: number;
  width: number;
  height: number;
  unit: 'metre' | 'inches' | 'mm';
}

export interface UpdateRoomData extends CreateRoomData {
  id: string;
}

const fetchRoomsByCustomer = async (customerId: string): Promise<Room[]> => {
  if (!customerId) return [];
  
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('customer_id', customerId)
    .order('name');

  if (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }

  return data || [];
};

const createRoom = async (roomData: CreateRoomData): Promise<Room> => {
  const { data, error } = await supabase
    .from('rooms')
    .insert([roomData])
    .select('*')
    .single();

  if (error) {
    console.error('Error creating room:', error);
    throw error;
  }

  return data;
};

const updateRoom = async (roomData: UpdateRoomData): Promise<Room> => {
  const { id, ...updates } = roomData;
  
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating room:', error);
    throw error;
  }

  return data;
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

export const useRoomsByCustomer = (customerId: string) => {
  return useQuery({
    queryKey: ['rooms', customerId],
    queryFn: () => fetchRoomsByCustomer(customerId),
    enabled: !!customerId,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRoom,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', data.customer_id] });
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateRoom,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', data.customer_id] });
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
