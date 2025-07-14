import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { calculateAreaInSquareFeet } from "./unitConversions";

export interface TileCalculationResult {
  tile: Tile;
  rooms: Room[];
  totalArea: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
  isWallTile?: boolean;
  wallLayers?: number[];
  quotationItems?: any[]; // Add this to track individual items
}

export interface FloorTileSelection {
  roomId: string;
  tileId: string;
}

export interface WallTileLayer {
  layerNumber: number;
  tileId: string;
  tilesNeeded: number;
}

export interface WallTileSelection {
  roomId: string;
  baseTileId: string | null;
  layers: WallTileLayer[];
  totalLayers: number;
}

/**
 * Unified tile calculation function
 * Handles both floor and wall tiles with proper wastage calculation
 */
export const calculateTileRequirements = (
  floorSelections: FloorTileSelection[],
  wallSelections: WallTileSelection[],
  rooms: Room[],
  tiles: Tile[],
  wastagePercentage: number
): TileCalculationResult[] => {
  const tileCalculations: { [key: string]: TileCalculationResult } = {};

  // Validate wastage percentage
  const validWastage = Math.max(0, Math.min(15, wastagePercentage));

  // Process floor tiles
  floorSelections.forEach(fs => {
    const room = rooms.find(r => r.id === fs.roomId);
    const tile = tiles.find(t => t.id === fs.tileId);
    
    if (!room || !tile) return;

    if (!tileCalculations[fs.tileId]) {
      tileCalculations[fs.tileId] = {
        tile,
        rooms: [],
        totalArea: 0,
        tilesNeeded: 0,
        boxesNeeded: 0,
        totalPrice: 0,
        isWallTile: false,
        piecesPerBox: 0,
      };
    }

    const roomAreaInSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
    tileCalculations[fs.tileId].rooms.push(room);
    tileCalculations[fs.tileId].totalArea += roomAreaInSqFt;
  });

  // Process wall tiles (group by tile ID across all layers)
  wallSelections.forEach(ws => {
    const room = rooms.find(r => r.id === ws.roomId);
    if (!room) return;

    // Group layers by tile ID
    const layersByTile: { [tileId: string]: number[] } = {};
    ws.layers.forEach(layer => {
      if (!layersByTile[layer.tileId]) {
        layersByTile[layer.tileId] = [];
      }
      layersByTile[layer.tileId].push(layer.layerNumber);
    });

    // Calculate area per layer (prevent division by zero)
    const wallAreaSqFt = calculateAreaInSquareFeet(
      room.wall_height || 0,
      room.wall_length || room.length || 0,
      room.unit
    );
    const areaPerLayer = ws.totalLayers > 0 ? wallAreaSqFt / ws.totalLayers : 0;

    // Create calculation entry for each unique tile used in wall
    Object.entries(layersByTile).forEach(([tileId, layerNumbers]) => {
      const tileKey = `${tileId}_wall`;
      const tile = tiles.find(t => t.id === tileId);
      
      if (!tile) return;

      if (!tileCalculations[tileKey]) {
        tileCalculations[tileKey] = {
          tile,
          rooms: [],
          totalArea: 0,
          tilesNeeded: 0,
          boxesNeeded: 0,
          totalPrice: 0,
          isWallTile: true,
          wallLayers: []
        };
      }

      tileCalculations[tileKey].rooms.push(room);
      tileCalculations[tileKey].totalArea += areaPerLayer * layerNumbers.length;
      tileCalculations[tileKey].wallLayers = [
        ...(tileCalculations[tileKey].wallLayers || []),
        ...layerNumbers
      ];
    });
  });

  // Calculate tiles, boxes, and pricing for each tile
  Object.values(tileCalculations).forEach(calc => {
    const tile = calc.tile;
    
    // Validate tile data
    if (!tile || !tile.size_length || !tile.size_breadth || !tile.pieces_per_box || !tile.price_per_box) {
      console.warn('Invalid tile data:', tile);
      return;
    }

    const pricePerBox = parseFloat(tile.price_per_box.toString());
    const piecesPerBox = parseInt(tile.pieces_per_box.toString());
    
    if (isNaN(pricePerBox) || isNaN(piecesPerBox) || piecesPerBox <= 0) {
      console.warn('Invalid tile pricing data:', tile);
      return;
    }

    // Convert tile dimensions from mm to feet
    const tileLengthFt = (parseFloat(tile.size_length.toString()) || 0) / 304.8;
    const tileBreadthFt = (parseFloat(tile.size_breadth.toString()) || 0) / 304.8;
    const tileAreaSqFt = tileLengthFt * tileBreadthFt;
    
    if (tileAreaSqFt <= 0) {
      console.warn('Invalid tile area:', tile);
      return;
    }

    // Step 1: Calculate basic tiles needed for the area
    const basicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
    
    // Step 2: Add wastage percentage to tiles
    calc.tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (validWastage / 100)));
    
    // Step 3: Calculate boxes needed from total tiles
    calc.boxesNeeded = Math.ceil(calc.tilesNeeded / piecesPerBox);
    
    // Step 4: Calculate total price
    calc.totalPrice = calc.boxesNeeded * pricePerBox;
  });

  return Object.values(tileCalculations);
};

/**
 * Calculate total cost from tile calculations
 */
export const calculateGrandTotal = (calculations: TileCalculationResult[]): number => {
  return calculations.reduce((sum, calc) => sum + (calc.totalPrice || 0), 0);
};

/**
 * Prepare quotation items from room selections
 */
export const prepareQuotationItems = (
  floorSelections: FloorTileSelection[],
  wallSelections: WallTileSelection[],
  rooms: Room[],
  tiles: Tile[],
  wastagePercentage: number
): Array<{
  tile_id: string;
  room_id: string;
  area: number;
  price_per_box: number;
  total_price: number;
  layer_number?: number;
}> => {
  const items: Array<{
    tile_id: string;
    room_id: string;
    area: number;
    price_per_box: number;
    total_price: number;
    layer_number?: number;
  }> = [];

  // Get the unified calculations first
  const calculations = calculateTileRequirements(
    floorSelections,
    wallSelections,
    rooms,
    tiles,
    wastagePercentage
  );

  // Floor tiles - use calculations from unified system
  floorSelections.forEach(fs => {
    const room = rooms.find(r => r.id === fs.roomId);
    const tile = tiles.find(t => t.id === fs.tileId);
    
    if (!room || !tile) return;

    const roomAreaInSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
    
    // Find the corresponding calculation
    const calc = calculations.find(c => c.tile.id === fs.tileId && !c.isWallTile);
    const totalPrice = calc ? calc.totalPrice : 0;

    items.push({
      tile_id: fs.tileId,
      room_id: fs.roomId,
      area: roomAreaInSqFt,
      price_per_box: parseFloat(tile.price_per_box?.toString() || '0'),
      total_price: totalPrice,
      // Floor tiles don't have layer numbers
    });
  });

  // Wall tiles - use calculations from unified system  
  wallSelections.forEach(ws => {
    const room = rooms.find(r => r.id === ws.roomId);
    if (!room) return;

    const wallAreaSqFt = calculateAreaInSquareFeet(
      room.wall_height || 0,
      room.wall_length || room.length || 0,
      room.unit
    );
    const areaPerLayer = ws.totalLayers > 0 ? wallAreaSqFt / ws.totalLayers : 0;

    // Group layers by tile ID to match calculation structure
    const layersByTile: { [tileId: string]: number[] } = {};
    ws.layers.forEach(layer => {
      if (!layersByTile[layer.tileId]) {
        layersByTile[layer.tileId] = [];
      }
      layersByTile[layer.tileId].push(layer.layerNumber);
    });

    // Create items for each layer individually
    ws.layers.forEach(layer => {
      const tile = tiles.find(t => t.id === layer.tileId);
      if (!tile) return;

      // Find the corresponding wall calculation  
      const calc = calculations.find(c => c.tile.id === layer.tileId && c.isWallTile);
      
      // Calculate proportional price for this specific layer
      let totalPrice = 0;
      
      if (calc && calc.totalArea > 0 && calc.wallLayers) {
        // Calculate price per layer based on total calculation
        const totalLayersForTile = calc.wallLayers.length;
        totalPrice = calc.totalPrice / totalLayersForTile;
      }
      
      // Ensure totalPrice is a valid number
      if (isNaN(totalPrice) || !isFinite(totalPrice)) {
        totalPrice = 0;
      }

      items.push({
        tile_id: layer.tileId,
        room_id: ws.roomId,
        area: areaPerLayer,
        price_per_box: parseFloat(tile.price_per_box?.toString() || '0'),
        total_price: totalPrice,
        layer_number: layer.layerNumber,
      });
    });
  });

  return items;
};