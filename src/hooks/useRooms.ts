import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getShowroomId } from './useShowroom';
import { getSessionInfo } from '@/utils/sessionCache';
import type { CanvasCell, CanvasEdge } from '@/types/canvas.types';

export interface MeasurementSet {
  id: number;
  length: string;
  width: string;
}

export interface Room {
  id: string;
  name: string;
  customer_id: string;
  room_type: 'room'; // Always 'room' — unified model
  
  // Floor surface
  has_floor: boolean;
  length: number;
  width: number;
  measurements?: any; // JSON field from database
  
  // Wall surface
  has_wall: boolean;
  wall_height?: number;
  wall_length?: number;
  wall_measurements?: any; // JSON field from database

  // Skirting surface
  has_skirting: boolean;
  skirting_length?: number; // total perimeter of skirting run
  skirting_height?: number; // height of skirting strip
  
  unit: 'metre' | 'inches' | 'mm' | 'feet';
  showroom_id?: string;
  created_at: string;

  // Canvas grid drawing data (null for manual-input rooms)
  canvas_cells?: CanvasCell[] | null;
  canvas_edges?: CanvasEdge[] | null;
  canvas_unit_ratio?: number | null;
}

export interface CreateRoomData {
  name: string;
  customer_id: string;
  has_floor: boolean;
  has_wall: boolean;
  length: number;
  width: number;
  measurements?: MeasurementSet[];
  wall_height?: number;
  wall_length?: number;
  wall_measurements?: MeasurementSet[];
  // Skirting surface
  has_skirting?: boolean;
  skirting_length?: number;
  skirting_height?: number;
  unit: 'metre' | 'inches' | 'mm' | 'feet';
  room_type: 'room';

  // Canvas grid drawing data
  canvas_cells?: CanvasCell[];
  canvas_edges?: CanvasEdge[];
  canvas_unit_ratio?: number;
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
  tile_type?: string; // 'floor' | 'skirting' — wall layers identified by layer_number > 0
  showroom_id?: string;
  created_at: string;
}

const fetchRoomsByCustomer = async (customerId: string): Promise<Room[]> => {
  if (!customerId) return [];

  // Single cached call replaces 4 separate Supabase requests
  const { showroomId, isSuperAdmin } = await getSessionInfo();

  let query = supabase
    .from('rooms')
    .select('*')
    .eq('customer_id', customerId)
    .order('name');

  if (showroomId && !isSuperAdmin) {
    query = query.eq('showroom_id', showroomId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }

  return (data || []).map(room => ({
    ...room,
    unit: room.unit as 'metre' | 'inches' | 'mm' | 'feet',
    room_type: 'room' as const,
    has_floor: room.has_floor ?? true,
    has_wall: room.has_wall ?? false,
    has_skirting: room.has_skirting ?? false,
  }));
};

const createRoom = async (roomData: CreateRoomData): Promise<Room> => {
  // Get showroom_id
  const showroom_id = await getShowroomId();
  if (!showroom_id) {
    throw new Error('No showroom assigned to user');
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert([{ ...roomData, showroom_id }])
    .select('*')
    .single();

  if (error) {
    console.error('Error creating room:', error);
    throw error;
  }

  return {
    ...data,
    unit: data.unit as 'metre' | 'inches' | 'mm' | 'feet',
    room_type: 'room' as const,
    has_floor: data.has_floor ?? true,
    has_wall: data.has_wall ?? false,
    has_skirting: data.has_skirting ?? false,
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
    room_type: 'room' as const,
    has_floor: data.has_floor ?? true,
    has_wall: data.has_wall ?? false,
    has_skirting: data.has_skirting ?? false,
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

  // Single cached call replaces 4 separate Supabase requests
  const { showroomId, isSuperAdmin } = await getSessionInfo();

  let query = supabase
    .from('room_tile_selections')
    .select('*')
    .eq('customer_id', customerId);

  if (showroomId && !isSuperAdmin) {
    query = query.eq('showroom_id', showroomId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching room tile selections:', error);
    throw error;
  }

  return data || [];
};

const saveRoomTileSelections = async (selections: { customer_id: string; room_id: string; tile_id: string; layer_number?: number; tile_type?: string }[]): Promise<void> => {
  if (selections.length === 0) return;

  // Get showroom_id
  const showroom_id = await getShowroomId();
  if (!showroom_id) {
    throw new Error('No showroom assigned to user');
  }

  // Ensure tile_type defaults to 'floor' for all selections
  const selectionsWithShowroom = selections.map(s => ({
    ...s,
    tile_type: s.tile_type ?? 'floor',
    showroom_id,
  }));

  const { error } = await supabase
    .from('room_tile_selections')
    .upsert(selectionsWithShowroom, { onConflict: 'room_id,tile_id,layer_number,tile_type' });

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
    .eq('tile_id', tileId)
    .is('layer_number', null)
    .eq('tile_type', 'floor'); // Only delete floor tiles

  if (error) {
    console.error('Error deleting room tile selection:', error);
    throw error;
  }
};

const deleteSkirtingTileSelection = async (roomId: string, tileId: string): Promise<void> => {
  const { error } = await supabase
    .from('room_tile_selections')
    .delete()
    .eq('room_id', roomId)
    .eq('tile_id', tileId)
    .eq('tile_type', 'skirting');

  if (error) {
    console.error('Error deleting skirting tile selection:', error);
    throw error;
  }
};

const deleteWallTileSelections = async (roomId: string): Promise<void> => {
  const { error } = await supabase
    .from('room_tile_selections')
    .delete()
    .eq('room_id', roomId)
    .gt('layer_number', 0); // Wall tiles have layer_number > 0

  if (error) {
    console.error('Error deleting wall tile selections:', error);
    throw error;
  }
};

const deleteWallTileLayerSelection = async (roomId: string, layerNumber: number): Promise<void> => {
  const { error } = await supabase
    .from('room_tile_selections')
    .delete()
    .eq('room_id', roomId)
    .eq('layer_number', layerNumber);

  if (error) {
    console.error('Error deleting wall tile layer selection:', error);
    throw error;
  }
};

export const useRoomsByCustomer = (customerId: string) => {
  return useQuery({
    queryKey: ['rooms', customerId],
    queryFn: () => fetchRoomsByCustomer(customerId),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 2, // 2 min — rooms don't change often
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
    staleTime: 1000 * 60 * 2, // 2 min
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

export const useDeleteSkirtingTileSelection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, tileId }: { roomId: string; tileId: string }) =>
      deleteSkirtingTileSelection(roomId, tileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-tile-selections'] });
    },
  });
};

export const useDeleteWallTileSelections = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => deleteWallTileSelections(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-tile-selections'] });
    },
  });
};

export const useDeleteWallTileLayerSelection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, layerNumber }: { roomId: string; layerNumber: number }) =>
      deleteWallTileLayerSelection(roomId, layerNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-tile-selections'] });
    },
  });
};
