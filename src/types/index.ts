/**
 * Centralized type definitions for Tylgo.
 * 
 * All domain entity types are defined here and re-exported from their
 * original hook files for backwards compatibility. When adding new types,
 * define them here first, then import in hooks/components.
 */

// Re-export all domain types from a single entry point
export type { Customer, CreateCustomerData } from './customer.types';
export type { Room, MeasurementSet, CreateRoomData, UpdateRoomData, RoomTileSelection, UnitType } from './room.types';
export type { Tile } from './tile.types';
export type { Staircase, StaircaseUnit, CreateStaircaseData, UpdateStaircaseData, StaircaseTileSelection as StaircaseDBTileSelection } from './staircase.types';
export type { Product, RoomProductSelection } from './product.types';
export type { CanvasCell, CanvasEdge, CanvasRoomShape } from './canvas.types';
export type {
  Quotation,
  QuotationItem,
  CreateQuotationData,
  QuotationFilters,
} from './quotation.types';
export type { Profile, UserRole, AuthContextType } from './auth.types';
