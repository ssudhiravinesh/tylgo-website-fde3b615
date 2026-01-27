import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getShowroomId } from './useShowroom';

export type StaircaseUnit = 'mm' | 'inches' | 'feet' | 'metre';

export interface Staircase {
  id: string;
  name: string;
  customer_id: string;
  number_of_steps: number;
  number_of_risers: number;
  // Dimension fields for area-based calculations
  step_length?: number;
  step_width?: number;
  riser_height?: number;
  riser_width?: number;
  unit?: StaircaseUnit;
  showroom_id?: string;
  created_at: string;
}

export interface CreateStaircaseData {
  name: string;
  customer_id: string;
  number_of_steps: number;
  number_of_risers: number;
  // Optional dimension fields
  step_length?: number;
  step_width?: number;
  riser_height?: number;
  riser_width?: number;
  unit?: StaircaseUnit;
}

export interface UpdateStaircaseData extends CreateStaircaseData {
  id: string;
}

export interface StaircaseTileSelection {
  id: string;
  staircase_id: string;
  customer_id: string;
  tile_id: string;
  tile_type: 'step' | 'riser';
  showroom_id?: string;
  created_at: string;
}

const fetchStaircasesByCustomer = async (customerId: string): Promise<Staircase[]> => {
  if (!customerId) return [];

  const showroom_id = await getShowroomId();

  const { data: { user } } = await supabase.auth.getUser();
  let isSuperAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      isSuperAdmin = true;
    }
  }

  let query = supabase
    .from('staircases')
    .select('*')
    .eq('customer_id', customerId)
    .order('name');

  if (showroom_id && !isSuperAdmin) {
    query = query.eq('showroom_id', showroom_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching staircases:', error);
    throw error;
  }

  return data || [];
};

const createStaircase = async (staircaseData: CreateStaircaseData): Promise<Staircase> => {
  const showroom_id = await getShowroomId();
  if (!showroom_id) {
    throw new Error('No showroom assigned to user');
  }

  const { data, error } = await supabase
    .from('staircases')
    .insert([{ ...staircaseData, showroom_id }])
    .select('*')
    .single();

  if (error) {
    console.error('Error creating staircase:', error);
    throw error;
  }

  return data;
};

const updateStaircase = async (staircaseData: UpdateStaircaseData): Promise<Staircase> => {
  const { id, ...updates } = staircaseData;

  const { data, error } = await supabase
    .from('staircases')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating staircase:', error);
    throw error;
  }

  return data;
};

const deleteStaircase = async (staircaseId: string): Promise<void> => {
  // Delete the staircase (cascade will handle tile selections)
  const { error } = await supabase
    .from('staircases')
    .delete()
    .eq('id', staircaseId);

  if (error) {
    console.error('Error deleting staircase:', error);
    throw error;
  }
};

const fetchStaircaseTileSelections = async (customerId: string): Promise<StaircaseTileSelection[]> => {
  if (!customerId) return [];

  const showroom_id = await getShowroomId();

  const { data: { user } } = await supabase.auth.getUser();
  let isSuperAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      isSuperAdmin = true;
    }
  }

  let query = supabase
    .from('staircase_tile_selections')
    .select('*')
    .eq('customer_id', customerId);

  if (showroom_id && !isSuperAdmin) {
    query = query.eq('showroom_id', showroom_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching staircase tile selections:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    tile_type: item.tile_type as 'step' | 'riser'
  }));
};

const saveStaircaseTileSelection = async (selection: {
  staircase_id: string;
  customer_id: string;
  tile_id: string;
  tile_type: 'step' | 'riser';
}): Promise<void> => {
  const showroom_id = await getShowroomId();
  if (!showroom_id) {
    throw new Error('No showroom assigned to user');
  }

  // First delete existing selection for this staircase and tile_type
  await supabase
    .from('staircase_tile_selections')
    .delete()
    .eq('staircase_id', selection.staircase_id)
    .eq('tile_type', selection.tile_type);

  // Then insert new selection
  const { error } = await supabase
    .from('staircase_tile_selections')
    .insert([{ ...selection, showroom_id }]);

  if (error) {
    console.error('Error saving staircase tile selection:', error);
    throw error;
  }
};

const deleteStaircaseTileSelection = async (staircaseId: string, tileType: 'step' | 'riser'): Promise<void> => {
  const { error } = await supabase
    .from('staircase_tile_selections')
    .delete()
    .eq('staircase_id', staircaseId)
    .eq('tile_type', tileType);

  if (error) {
    console.error('Error deleting staircase tile selection:', error);
    throw error;
  }
};

export const useStaircasesByCustomer = (customerId: string) => {
  return useQuery({
    queryKey: ['staircases', customerId],
    queryFn: () => fetchStaircasesByCustomer(customerId),
    enabled: !!customerId,
  });
};

export const useCreateStaircase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStaircase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staircases', data.customer_id] });
    },
  });
};

export const useUpdateStaircase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStaircase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staircases', data.customer_id] });
    },
  });
};

export const useDeleteStaircase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStaircase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staircases'] });
    },
  });
};

export const useStaircaseTileSelections = (customerId: string) => {
  return useQuery({
    queryKey: ['staircase-tile-selections', customerId],
    queryFn: () => fetchStaircaseTileSelections(customerId),
    enabled: !!customerId,
  });
};

export const useSaveStaircaseTileSelection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveStaircaseTileSelection,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staircase-tile-selections', variables.customer_id] });
    },
  });
};

export const useDeleteStaircaseTileSelection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staircaseId, tileType }: { staircaseId: string; tileType: 'step' | 'riser' }) =>
      deleteStaircaseTileSelection(staircaseId, tileType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staircase-tile-selections'] });
    },
  });
};
