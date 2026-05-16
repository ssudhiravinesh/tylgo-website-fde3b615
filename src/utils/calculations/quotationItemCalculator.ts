/**
 * Unified quotation item calculator.
 * 
 * This is the SINGLE SOURCE OF TRUTH for calculating tile requirements
 * from stored quotation items. Both QuotationDetails and pdfGenerators
 * must use this instead of duplicating the calculation logic.
 * 
 * For calculating from live room selections (before quotation is saved),
 * use `tileCalculations.ts` instead.
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface StoredQuotationItem {
  tile_id?: string | null;
  product_id?: string | null;
  room_id?: string | null;
  staircase_id?: string | null;
  area?: number;
  price_per_box: number;
  total_price: number;
  layer_number?: number;
  custom_boxes?: number;
  quantity?: number;
  tile_type?: string;
  tile?: {
    id: string;
    code: string;
    size_length: number;
    size_breadth: number;
    price_per_box: number;
    pieces_per_box: number;
    category?: string;
    image_url?: string;
  };
  product?: {
    id: string;
    name: string;
    code: string;
    price: number;
    image_url?: string;
  };
  room?: {
    id: string;
    name: string;
    length: number;
    width: number;
    unit: string;
    has_floor?: boolean;
    has_wall?: boolean;
    wall_length?: number;
    wall_height?: number;
    measurements?: Array<{ length: string; width: string }>;
  };
  staircase?: {
    id: string;
    name: string;
    number_of_steps: number;
    number_of_risers: number;
  };
  // Some items use `staircases` (plural) from certain DB queries
  staircases?: {
    id: string;
    name: string;
    number_of_steps: number;
    number_of_risers: number;
  };
}

export interface TileCalcResult {
  type: 'tile';
  tile: {
    id: string;
    code: string;
    price_per_box: number;
    pieces_per_box: number;
    size_length: number;
    size_breadth: number;
    category?: string;
    image_url?: string;
  };
  rooms: Array<{
    id: string;
    name: string;
    length: number;
    width: number;
    unit: string;
    has_floor?: boolean;
    has_wall?: boolean;
    wall_length?: number;
    wall_height?: number;
    measurements?: Array<{ length: string; width: string }>;
    layerNumber?: number | null;
  }>;
  staircases: Array<{
    id: string;
    name: string;
    type: 'step' | 'riser';
    quantity: number;
  }>;
  totalArea: number;
  customBoxAdjustment: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
}

export interface ProductCalcResult {
  type: 'product';
  product: {
    id: string;
    code?: string;
    name: string;
    price: number;
    image_url?: string;
  };
  quantity: number;
  totalPrice: number;
}

export type ItemCalcResult = TileCalcResult | ProductCalcResult;

// ─── Core Calculator ──────────────────────────────────────────────────

/**
 * Calculates tile requirements and product totals from stored quotation items.
 * 
 * This function groups items by tile_id, accumulates areas from rooms,
 * quantities from staircases, applies wastage, and calculates boxes/pricing.
 * 
 * @param items - Array of quotation items from database
 * @param wastagePercentage - Wastage percentage (0-15)
 * @returns Object with calculations array and computed MRP
 */
export function calculateFromQuotationItems(
  items: StoredQuotationItem[],
  wastagePercentage: number
): { calculations: ItemCalcResult[]; mrp: number } {
  const tileMap: Record<string, TileCalcResult> = {};
  const productMap: Record<string, ProductCalcResult> = {};

  // ── Step 1: Group items ─────────────────────────────────────────────

  for (const item of items) {
    // Handle product items
    if (item.product_id && item.product) {
      const existing = productMap[item.product_id];
      if (existing) {
        existing.quantity += (item.quantity || 0);
        existing.totalPrice += (item.total_price || ((item.quantity || 0) * (item.product.price || 0)));
      } else {
        productMap[item.product_id] = {
          type: 'product',
          product: {
            id: item.product_id,
            code: item.product.code,
            name: item.product.name,
            price: item.product.price || 0,
            image_url: item.product.image_url,
          },
          quantity: item.quantity || 0,
          totalPrice: item.total_price || ((item.quantity || 0) * (item.product.price || 0)),
        };
      }
      continue;
    }

    // Handle tile items
    const tileId = item.tile_id;
    if (!tileId || !item.tile) continue;

    if (!tileMap[tileId]) {
      tileMap[tileId] = {
        type: 'tile',
        tile: {
          id: tileId,
          code: item.tile.code,
          price_per_box: item.tile.price_per_box,
          pieces_per_box: item.tile.pieces_per_box,
          size_length: item.tile.size_length,
          size_breadth: item.tile.size_breadth,
          category: item.tile.category,
          image_url: item.tile.image_url,
        },
        rooms: [],
        staircases: [],
        totalArea: 0,
        customBoxAdjustment: 0,
        tilesNeeded: 0,
        boxesNeeded: 0,
        totalPrice: 0,
      };
    }

    const calc = tileMap[tileId];

    // Room-based items
    const room = item.room;
    if (room && item.room_id) {
      calc.totalArea += Number(item.area || 0);
      calc.rooms.push({
        id: item.room_id,
        name: room.name,
        length: room.length,
        width: room.width,
        unit: room.unit,
        has_floor: room.has_floor,
        has_wall: room.has_wall,
        wall_length: room.wall_length,
        wall_height: room.wall_height,
        measurements: room.measurements,
        layerNumber: item.layer_number ?? null,
      });
    }

    // Staircase-based items
    const staircase = item.staircase || item.staircases;
    if (staircase && item.staircase_id) {
      calc.staircases.push({
        id: item.staircase_id,
        name: staircase.name,
        type: (item.tile_type as 'step' | 'riser') || 'step',
        quantity: item.quantity || 0,
      });
    }

    // Custom box adjustments
    calc.customBoxAdjustment += Number(item.custom_boxes || 0);
  }

  // ── Step 2: Calculate tiles, boxes, pricing ─────────────────────────

  for (const calc of Object.values(tileMap)) {
    const { tile } = calc;

    if (!tile.size_length || !tile.size_breadth || !tile.pieces_per_box || !tile.price_per_box) {
      continue;
    }

    const pricePerBox = tile.price_per_box;
    const piecesPerBox = tile.pieces_per_box;

    if (piecesPerBox <= 0) continue;

    // Tiles from rooms (area-based)
    let roomTilesNeeded = 0;
    if (calc.totalArea > 0) {
      const tileLengthFt = tile.size_length / 304.8;
      const tileBreadthFt = tile.size_breadth / 304.8;
      const tileAreaSqFt = tileLengthFt * tileBreadthFt;

      if (tileAreaSqFt > 0) {
        const basicTiles = Math.ceil(calc.totalArea / tileAreaSqFt);
        roomTilesNeeded = Math.ceil(basicTiles * (1 + (wastagePercentage / 100)));
      }
    }

    // Tiles from staircases (quantity-based)
    // NOTE: quantity stored in DB is already post-wastage (applied at save time in tileCalculations.ts).
    // Do NOT apply wastage again — that was causing double-wastage on staircase tiles.
    let staircaseTilesNeeded = 0;
    if (calc.staircases.length > 0) {
      staircaseTilesNeeded = calc.staircases.reduce((sum, s) => sum + s.quantity, 0);
    }

    // Combine
    calc.tilesNeeded = roomTilesNeeded + staircaseTilesNeeded;

    const baseBoxes = Math.ceil(calc.tilesNeeded / piecesPerBox);
    calc.boxesNeeded = Math.max(0, baseBoxes + calc.customBoxAdjustment);

    // If manually adjusted, reflect in tiles count
    if (calc.customBoxAdjustment !== 0) {
      calc.tilesNeeded = calc.boxesNeeded * piecesPerBox;
    }

    calc.totalPrice = calc.boxesNeeded * pricePerBox;
  }

  // ── Step 3: Combine and return ──────────────────────────────────────

  const calculations: ItemCalcResult[] = [
    ...Object.values(tileMap),
    ...Object.values(productMap),
  ];

  const mrp = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  return { calculations, mrp };
}
