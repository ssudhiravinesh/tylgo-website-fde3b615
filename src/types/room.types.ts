export type UnitType = 'metre' | 'inches' | 'mm' | 'feet';

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
  length: number;        // Floor area (aggregated from measurements)
  width: number;         // Floor width (1 when using multi-shape)
  measurements?: MeasurementSet[]; // Floor multi-shape dimensions
  
  // Wall surface
  has_wall: boolean;
  wall_height?: number;  // Wall height (aggregated from wall_measurements)
  wall_length?: number;  // Wall length (1 when using multi-shape)
  wall_measurements?: MeasurementSet[]; // Wall multi-shape dimensions
  
  unit: UnitType;
  showroom_id?: string;
  created_at: string;
}

export interface CreateRoomData {
  name: string;
  customer_id: string;
  has_floor: boolean;
  has_wall: boolean;
  // Floor dimensions
  length: number;
  width: number;
  measurements?: MeasurementSet[];
  // Wall dimensions
  wall_height?: number;
  wall_length?: number;
  wall_measurements?: MeasurementSet[];
  unit: UnitType;
  room_type: 'room';
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
  showroom_id?: string;
  created_at: string;
}
