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
  length: number;
  width: number;
  unit: UnitType;
  room_type: 'floor' | 'wall';
  wall_height?: number;
  wall_length?: number;
  measurements?: MeasurementSet[];
  showroom_id?: string;
  created_at: string;
}

export interface CreateRoomData {
  name: string;
  customer_id: string;
  length: number;
  width: number;
  unit: UnitType;
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
  showroom_id?: string;
  created_at: string;
}
