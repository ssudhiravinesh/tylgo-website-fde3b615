import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { calculateAreaInSquareFeet } from "./unitConversions";

export interface TileCalculationResult {
  tile: Tile;
  rooms: Room[];
  totalArea: number;
  rawTilesNeeded: number; // Exact tiles needed based on area calculation
  tilesNeeded: number; // After wastage
  fullBoxes: number; // Complete boxes needed
  leftoverTiles: number; // Extra tiles from partial box
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

export interface StaircaseTileSelection {
  staircaseId: string;
  stepTileId?: string;
  riserTileId?: string;
}

export interface StaircaseTileCalculationResult {
  staircase: {
    id: string;
    name: string;
    number_of_steps: number;
    number_of_risers: number;
  };
  stepTile?: {
    tile: any;
    tilesNeeded: number;
    boxesNeeded: number;
    totalPrice: number;
  };
  riserTile?: {
    tile: any;
    tilesNeeded: number;
    boxesNeeded: number;
    totalPrice: number;
  };
  totalPrice: number;
}

/**
 * Format tile breakdown for display
 */
export const formatTileBreakdown = (
  rawTilesNeeded: number,
  fullBoxes: number,
  leftoverTiles: number,
  piecesPerBox: number,
  wastagePercentage: number
): string => {
  const parts: string[] = [];

  if (fullBoxes > 0) {
    parts.push(`${fullBoxes} ${fullBoxes === 1 ? 'box' : 'boxes'}`);
  }

  if (leftoverTiles > 0) {
    parts.push(`${leftoverTiles} ${leftoverTiles === 1 ? 'tile' : 'tiles'}`);
  }

  const breakdown = parts.length > 0 ? `(${parts.join(' and ')})` : '';
  const wastageText = wastagePercentage > 0 ? ` (+${wastagePercentage}% wastage)` : '';

  return `${rawTilesNeeded} ${rawTilesNeeded === 1 ? 'tile' : 'tiles'} ${breakdown}${wastageText}`;
};

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
        rawTilesNeeded: 0,
        tilesNeeded: 0,
        fullBoxes: 0,
        leftoverTiles: 0,
        boxesNeeded: 0,
        totalPrice: 0,
        isWallTile: false
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
          rawTilesNeeded: 0,
          tilesNeeded: 0,
          fullBoxes: 0,
          leftoverTiles: 0,
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

    // Step 1: Calculate exact tiles needed (total area ÷ single tile area)
    calc.rawTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);

    // Step 2: Add wastage percentage to get final tiles needed
    calc.tilesNeeded = Math.ceil(calc.rawTilesNeeded * (1 + (validWastage / 100)));

    // Step 3: Calculate box breakdown
    calc.fullBoxes = Math.floor(calc.rawTilesNeeded / piecesPerBox);
    calc.leftoverTiles = calc.rawTilesNeeded % piecesPerBox;
    calc.boxesNeeded = Math.ceil(calc.tilesNeeded / piecesPerBox);

    // Step 4: Calculate total price
    calc.totalPrice = calc.boxesNeeded * pricePerBox;
  });

  return Object.values(tileCalculations);
};

// utils/calculations.ts
export const calculateDiscount = (mrp: number, discountPercentage: number) => {
  const discountAmount = (mrp * discountPercentage) / 100;
  const finalTotal = mrp - discountAmount;
  return { discountAmount, finalTotal };
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

  // Floor tiles - calculate proportional pricing per room
  floorSelections.forEach(fs => {
    const room = rooms.find(r => r.id === fs.roomId);
    const tile = tiles.find(t => t.id === fs.tileId);

    if (!room || !tile) return;

    const roomAreaInSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);

    // Find the corresponding calculation
    const calc = calculations.find(c => c.tile.id === fs.tileId && !c.isWallTile);

    // Calculate proportional price based on this room's area vs total area for this tile
    let roomPrice = 0;
    if (calc && calc.totalArea > 0) {
      const roomProportion = roomAreaInSqFt / calc.totalArea;
      roomPrice = calc.totalPrice * roomProportion;
    }

    items.push({
      tile_id: fs.tileId,
      room_id: fs.roomId,
      area: roomAreaInSqFt,
      price_per_box: parseFloat(tile.price_per_box?.toString() || '0'),
      total_price: roomPrice,
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

/**
 * Get the number of tiles needed per step/riser based on tile aspect ratio.
 * 1:3 ratio tiles (e.g., 300x900mm): 1 tile per unit
 * 1:1 ratio tiles (e.g., 600x600mm): 3 tiles per unit
 */
const getTilesPerUnit = (tile: any): number => {
  const length = tile.size_length || 0;
  const breadth = tile.size_breadth || 0;
  if (length === 0 || breadth === 0) return 1; // Default to 1 if dimensions are missing

  const ratio = Math.max(length, breadth) / Math.min(length, breadth);
  // If ratio is >= 2.5 (approximately 1:3), 1 tile per unit
  // Otherwise (1:1 or closer), 3 tiles per unit
  return ratio >= 2.5 ? 1 : 3;
};

/**
 * Calculate staircase tile requirements
 * Tiles per step/riser depend on tile aspect ratio:
 * - 1:3 tiles (e.g., 300x900): 1 tile each
 * - 1:1 tiles (e.g., 600x600): 3 tiles each
 */
export const calculateStaircaseTileRequirements = (
  staircaseSelections: StaircaseTileSelection[],
  staircases: Array<{
    id: string;
    name: string;
    number_of_steps: number;
    number_of_risers: number;
  }>,
  tiles: any[],
  wastagePercentage: number
): StaircaseTileCalculationResult[] => {
  const results: StaircaseTileCalculationResult[] = [];
  const validWastage = Math.max(0, Math.min(15, wastagePercentage));

  staircaseSelections.forEach(selection => {
    const staircase = staircases.find(s => s.id === selection.staircaseId);
    if (!staircase) return;

    let totalPrice = 0;
    let stepTileResult;
    let riserTileResult;

    // Calculate step tiles
    if (selection.stepTileId) {
      const tile = tiles.find(t => t.id === selection.stepTileId);
      if (tile) {
        const tilesPerUnit = getTilesPerUnit(tile);
        const rawTilesNeeded = staircase.number_of_steps * tilesPerUnit;
        const tilesNeeded = Math.ceil(rawTilesNeeded * (1 + validWastage / 100));
        const piecesPerBox = parseInt(tile.pieces_per_box?.toString() || '1');
        const pricePerBox = parseFloat(tile.price_per_box?.toString() || '0');
        const boxesNeeded = Math.ceil(tilesNeeded / piecesPerBox);
        const price = boxesNeeded * pricePerBox;

        stepTileResult = {
          tile,
          tilesNeeded: rawTilesNeeded, // Store raw count (without wastage) for display
          boxesNeeded,
          totalPrice: price
        };
        totalPrice += price;
      }
    }

    // Calculate riser tiles
    if (selection.riserTileId) {
      const tile = tiles.find(t => t.id === selection.riserTileId);
      if (tile) {
        const tilesPerUnit = getTilesPerUnit(tile);
        const rawTilesNeeded = staircase.number_of_risers * tilesPerUnit;
        const tilesNeeded = Math.ceil(rawTilesNeeded * (1 + validWastage / 100));
        const piecesPerBox = parseInt(tile.pieces_per_box?.toString() || '1');
        const pricePerBox = parseFloat(tile.price_per_box?.toString() || '0');
        const boxesNeeded = Math.ceil(tilesNeeded / piecesPerBox);
        const price = boxesNeeded * pricePerBox;

        riserTileResult = {
          tile,
          tilesNeeded: rawTilesNeeded, // Store raw count (without wastage) for display
          boxesNeeded,
          totalPrice: price
        };
        totalPrice += price;
      }
    }

    results.push({
      staircase,
      stepTile: stepTileResult,
      riserTile: riserTileResult,
      totalPrice
    });
  });

  return results;
};


/**
 * Prepare staircase quotation items
 */
export const prepareStaircaseQuotationItems = (
  staircaseSelections: StaircaseTileSelection[],
  staircases: Array<{
    id: string;
    name: string;
    number_of_steps: number;
    number_of_risers: number;
  }>,
  tiles: any[],
  wastagePercentage: number
): Array<{
  tile_id: string;
  staircase_id: string;
  staircase_name: string;
  tile_type: 'step' | 'riser';
  quantity: number;
  price_per_box: number;
  total_price: number;
}> => {
  const items: Array<{
    tile_id: string;
    staircase_id: string;
    staircase_name: string;
    tile_type: 'step' | 'riser';
    quantity: number;
    price_per_box: number;
    total_price: number;
  }> = [];

  const calculations = calculateStaircaseTileRequirements(
    staircaseSelections,
    staircases,
    tiles,
    wastagePercentage
  );

  calculations.forEach(calc => {
    if (calc.stepTile) {
      items.push({
        tile_id: calc.stepTile.tile.id,
        staircase_id: calc.staircase.id,
        staircase_name: calc.staircase.name,
        tile_type: 'step',
        quantity: calc.stepTile.tilesNeeded,
        price_per_box: parseFloat(calc.stepTile.tile.price_per_box?.toString() || '0'),
        total_price: calc.stepTile.totalPrice
      });
    }

    if (calc.riserTile) {
      items.push({
        tile_id: calc.riserTile.tile.id,
        staircase_id: calc.staircase.id,
        staircase_name: calc.staircase.name,
        tile_type: 'riser',
        quantity: calc.riserTile.tilesNeeded,
        price_per_box: parseFloat(calc.riserTile.tile.price_per_box?.toString() || '0'),
        total_price: calc.riserTile.totalPrice
      });
    }
  });

  return items;
};
