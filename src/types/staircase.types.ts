export type StaircaseUnit = 'mm' | 'inches' | 'feet' | 'metre';

export interface Staircase {
  id: string;
  name: string;
  customer_id: string;
  number_of_steps: number;
  number_of_risers: number;
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
