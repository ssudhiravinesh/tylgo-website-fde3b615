import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { calculateAreaInSquareFeet } from "./unitConversions";

export interface TileCalculationResult {
  tile: Tile;
  rooms: Room[];
  totalArea: number;
  rawTilesNeeded: number;     // NEW
  boxesNeeded: number;
  orderedTiles: number;       // NEW
  fullBoxes: number;          // NEW: conceptual full boxes (floor division)
  leftoverTiles: number;      // NEW: conceptual leftover
  totalPrice: number;
  isWallTile?: boolean;
  wallLayers?: number[];
  quotationItems?: any[];
  piecesPerBox: number;
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

export const calculateTileRequirements = (
  floorSelections: FloorTileSelection[],
  wallSelections: WallTileSelection[],
  rooms: Room[],
  tiles: Tile[],
  wastagePercentage: number
): TileCalculationResult[] => {
  const tileCalculations: { [key: string]: TileCalculationResult } = {};
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
        piecesPerBox: 0 // Initialize piecesPerBox
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
          wallLayers: [],
          piecesPerBox: 0 // Initialize piecesPerBox
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
    const pricePerBox = parseFloat(tile.price_per_box.toString());
    const piecesPerBox = parseInt(tile.pieces_per_box.toString());
    const tileLengthFt = (parseFloat(tile.size_length.toString()) || 0) / 304.8;
    const tileBreadthFt = (parseFloat(tile.size_breadth.toString()) || 0) / 304.8;
    const tileAreaSqFt = tileLengthFt * tileBreadthFt;

    // Step 1: raw tiles needed (area + wastage)
    const basicTiles = calc.totalArea / tileAreaSqFt;
    const rawTilesNeeded = Math.ceil(basicTiles * (1 + validWastage / 100));

    // Step 2: boxes to order
    const boxesNeeded = Math.ceil(rawTilesNeeded / piecesPerBox);

    // Step 3: ordered tiles physical
    const orderedTiles = boxesNeeded * piecesPerBox;

    // Step 4: conceptual breakdown
    const fullBoxes = Math.floor(rawTilesNeeded / piecesPerBox);
    const leftoverTiles = rawTilesNeeded % piecesPerBox;

    // Assign
    calc.rawTilesNeeded = rawTilesNeeded;
    calc.boxesNeeded = boxesNeeded;
    calc.orderedTiles   = orderedTiles;
    calc.fullBoxes      = fullBoxes;
    calc.leftoverTiles  = leftoverTiles;
    calc.totalPrice     = boxesNeeded * pricePerBox;
    calc.piecesPerBox   = piecesPerBox;
  });

  return Object.values(tileCalculations);
};

export const calculateGrandTotal = (calculations: TileCalculationResult[]): number =>
  calculations.reduce((sum, calc) => sum + (calc.totalPrice || 0), 0);

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
