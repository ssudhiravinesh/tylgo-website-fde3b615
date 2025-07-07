import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Room {
  id: string;
  name: string;
  customer_id: string;
  length: number;
  width: number;
  unit: 'metre' | 'inches' | 'mm' | 'feet';
  room_type: 'floor' | 'wall';
  wall_height?: number;
  wall_length?: number;
  created_at: string;
}

export interface CreateRoomData {
  name: string;
  customer_id: string;
  length: number;
  width: number;
  unit: 'metre' | 'inches' | 'mm' | 'feet';
  room_type: 'floor' | 'wall';
  wall_height?: number;
  wall_length?: number;
}

export interface UpdateRoomData extends CreateRoomData {
  id: string;
}

export interface RoomTileSelection {
  id: string;
  customer_id: string;
  room_id: string;
  tile_id: string;
  layer_number?: number;
  created_at: string;
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

  return (data || []).map(room => ({
    ...room,
    unit: room.unit as 'metre' | 'inches' | 'mm' | 'feet',
    room_type: room.room_type as 'floor' | 'wall'
  }));
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

  return {
    ...data,
    unit: data.unit as 'metre' | 'inches' | 'mm' | 'feet',
    room_type: data.room_type as 'floor' | 'wall'
  };
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

  return {
    ...data,
    unit: data.unit as 'metre' | 'inches' | 'mm' | 'feet',
    room_type: data.room_type as 'floor' | 'wall'
  };
};

const deleteRoom = async (roomId: string): Promise<void> => {
  // First, delete all tile selections for this room
  const { error: selectionsError } = await supabase
    .from('room_tile_selections')
    .delete()
    .eq('room_id', roomId);

  if (selectionsError) {
    console.error('Error deleting room tile selections:', selectionsError);
    throw selectionsError;
  }

  // Then, delete all quotation items for this room
  const { error: quotationItemsError } = await supabase
    .from('quotation_items')
    .delete()
    .eq('room_id', roomId);

  if (quotationItemsError) {
    console.error('Error deleting quotation items:', quotationItemsError);
    throw quotationItemsError;
  }

  // Finally, delete the room itself
  const { error: roomError } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (roomError) {
    console.error('Error deleting room:', roomError);
    throw roomError;
  }
};

const fetchRoomTileSelections = async (customerId: string): Promise<RoomTileSelection[]> => {
  if (!customerId) return [];
  
  const { data, error } = await supabase
    .from('room_tile_selections')
    .select('*')
    .eq('customer_id', customerId);

  if (error) {
    console.error('Error fetching room tile selections:', error);
    throw error;
  }

  return data || [];
};

const saveRoomTileSelections = async (selections: { customer_id: string; room_id: string; tile_id: string; layer_number?: number }[]): Promise<void> => {
  if (selections.length === 0) return;

  const { error } = await supabase
    .from('room_tile_selections')
    .upsert(selections, { onConflict: 'room_id,tile_id,layer_number' });

  if (error) {
    console.error('Error saving room tile selections:', error);
    throw error;
  }
};

const deleteRoomTileSelection = async (roomId: string, tileId: string): Promise<void> => {
  const { error } = await supabase
    .from('room_tile_selections')
    .delete()
    .eq('room_id', roomId)
    .eq('tile_id', tileId);

  if (error) {
    console.error('Error deleting room tile selection:', error);
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
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['room-tile-selections'] });
    },
  });
};

export const useRoomTileSelections = (customerId: string) => {
  return useQuery({
    queryKey: ['room-tile-selections', customerId],
    queryFn: () => fetchRoomTileSelections(customerId),
    enabled: !!customerId,
  });
};

export const useSaveRoomTileSelections = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: saveRoomTileSelections,
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['room-tile-selections', variables[0].customer_id] });
      }
    },
  });
};

export const useDeleteRoomTileSelection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roomId, tileId }: { roomId: string; tileId: string }) => 
      deleteRoomTileSelection(roomId, tileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-tile-selections'] });
    },
  });
};
