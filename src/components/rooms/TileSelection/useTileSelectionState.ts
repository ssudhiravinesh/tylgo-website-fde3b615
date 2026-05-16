/**
 * Custom hook encapsulating all state and DB-sync logic for TileSelectionStep.
 * 
 * Updated for unified room model: rooms can have both floor and wall surfaces.
 * Instead of splitting into floorRooms/wallRooms, we operate on the full room list
 * and check has_floor/has_wall flags per room.
 */

import { useState, useEffect } from "react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections } from "@/hooks/useRooms";
import { useStaircaseTileSelections } from "@/hooks/useStaircases";
import { useCustomerProducts } from "@/hooks/useCustomerProducts";
import { useRoomProductSelections } from "@/hooks/useProductSelections";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import type { Staircase } from "@/hooks/useStaircases";
import type {
  FloorTileSelection,
  WallTileSelection,
  StaircaseTileSelection as StaircaseTileSelectionType,
} from "@/utils/tileCalculations";

export interface CatalogContext {
  roomId?: string;
  roomIds?: string[];
  staircaseId?: string;
  staircaseTileType?: 'step' | 'riser';
  isWallTile: boolean;
  layerNumber?: number;
}

export function useTileSelectionState(
  customerId: string,
  rooms: Room[],
  staircases: Staircase[]
) {
  // ── Data fetching hooks ────────────────────────────────────────────
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const { data: staircaseSelections = [], isLoading: staircaseSelectionsLoading } = useStaircaseTileSelections(customerId);
  const { data: customerProducts = [] } = useCustomerProducts(customerId);
  const { data: productSelections = [], isLoading: productSelectionsLoading } = useRoomProductSelections(customerId);

  // ── Local state ────────────────────────────────────────────────────
  const [floorTileSelections, setFloorTileSelections] = useState<FloorTileSelection[]>([]);
  const [wallTileSelections, setWallTileSelections] = useState<WallTileSelection[]>([]);
  const [staircaseTileSelectionsState, setStaircaseTileSelectionsState] = useState<StaircaseTileSelectionType[]>([]);
  const [skirtingTileSelections, setSkirtingTileSelections] = useState<Record<string, string>>({}); // { roomId: tileId }
  const [wastagePercentage, setWastagePercentage] = useState<string>("0");
  const [selectedFloorRooms, setSelectedFloorRooms] = useState<Set<string>>(new Set());

  // UI state
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [catalogContext, setCatalogContext] = useState<CatalogContext | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showWallTileSelection, setShowWallTileSelection] = useState<{
    roomId: string;
    room: Room;
  } | null>(null);
  const [showRoomPreview, setShowRoomPreview] = useState<{
    room: Room;
    floorTile: Tile | null;
    wallLayers: Tile[];
  } | null>(null);

  // ── Derived values ─────────────────────────────────────────────────
  // Rooms with floor surface enabled (for floor tile selection)
  const floorRooms = rooms.filter(room => room.has_floor);
  // Rooms with wall surface enabled (for wall tile configuration)
  const wallRooms = rooms.filter(room => room.has_wall);
  // Rooms with skirting surface enabled
  const skirtingRooms = rooms.filter(room => room.has_skirting);

  const getWastagePercentage = (): number => {
    const parsed = parseFloat(wastagePercentage);
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(15, parsed));
  };

  const isLoading = tilesLoading || selectionsLoading || staircaseSelectionsLoading;

  // ── DB → State sync: Staircase selections ─────────────────────────
  useEffect(() => {
    if (staircaseSelections.length === 0) return;

    const loadedSelections: StaircaseTileSelectionType[] = [];

    staircases.forEach(staircase => {
      const stepSelection = staircaseSelections.find(
        s => s.staircase_id === staircase.id && s.tile_type === 'step'
      );
      const riserSelection = staircaseSelections.find(
        s => s.staircase_id === staircase.id && s.tile_type === 'riser'
      );

      if (stepSelection || riserSelection) {
        loadedSelections.push({
          staircaseId: staircase.id,
          stepTileId: stepSelection?.tile_id,
          riserTileId: riserSelection?.tile_id
        });
      }
    });

    setStaircaseTileSelectionsState(loadedSelections);
  }, [staircaseSelections, staircases]);

  // ── DB → State sync: Room tile selections ─────────────────────────
  useEffect(() => {
    if (selections.length === 0 && tiles.length === 0) return;

    const floorSelections: FloorTileSelection[] = [];
    const wallSelections: WallTileSelection[] = [];
    const newSkirtingSelections: Record<string, string> = {};

    selections.forEach(selection => {
      const room = rooms.find(r => r.id === selection.room_id);
      if (!room) return;

      const layerNumber = selection.layer_number;
      const isWallSelection = layerNumber !== null && layerNumber !== undefined && layerNumber > 0;
      const isSkirtingSelection = selection.tile_type === 'skirting';

      if (isSkirtingSelection) {
        // Skirting tile — store as roomId → tileId map
        newSkirtingSelections[selection.room_id] = selection.tile_id;
      } else if (!isWallSelection && room.has_floor) {
        // Floor tile selection (no layer_number or layer_number=0/null)
        const existingFloorSelection = floorSelections.find(
          fs => fs.roomId === selection.room_id && fs.tileId === selection.tile_id
        );
        if (!existingFloorSelection) {
          floorSelections.push({
            roomId: selection.room_id,
            tileId: selection.tile_id
          });
        }
      } else if (isWallSelection && room.has_wall) {
        // Wall tile selection (has layer_number > 0)
        let wallSelection = wallSelections.find(ws => ws.roomId === selection.room_id);
        if (!wallSelection) {
          wallSelection = {
            roomId: selection.room_id,
            baseTileId: null,
            layers: [],
            totalLayers: 0
          };
          wallSelections.push(wallSelection);
        }

        const existingLayer = wallSelection.layers.find(l => l.layerNumber === layerNumber);
        if (!existingLayer) {
          const baseTile = tiles.find(t => t.id === selection.tile_id);
          let tilesNeeded = 0;

          if (baseTile && room) {
            const wallHeight = room.wall_height || 0;
            // wall_length = wall perimeter (explicitly set by worker).
            // Do NOT fall back to room.length — that's the floor area (area-hack), not perimeter.
            const wallLength = room.wall_length || 0;

            // Wall tiles are laid horizontally:
            //   size_length (longer side) → runs along the wall horizontally
            //   size_breadth (shorter side) → runs vertically against wall height
            // ∴ layerCount = ceil(wallHeight / size_breadth)  ← vertical dimension
            let tileVerticalInRoomUnit: number;  // shorter side, against wall height
            let tileHorizontalInRoomUnit: number; // longer side, along wall length

            if (room.unit === "feet") {
              tileVerticalInRoomUnit   = (baseTile.size_breadth || 0) / 304.8;
              tileHorizontalInRoomUnit = (baseTile.size_length  || 0) / 304.8;
            } else if (room.unit === "metre") {
              tileVerticalInRoomUnit   = (baseTile.size_breadth || 0) / 1000;
              tileHorizontalInRoomUnit = (baseTile.size_length  || 0) / 1000;
            } else {
              // mm (room dimensions stored in mm)
              tileVerticalInRoomUnit   = baseTile.size_breadth || 0;
              tileHorizontalInRoomUnit = baseTile.size_length  || 0;
            }

            if (tileVerticalInRoomUnit > 0 && tileHorizontalInRoomUnit > 0) {
              const totalArea = wallHeight * wallLength;
              const tileArea = tileVerticalInRoomUnit * tileHorizontalInRoomUnit;
              const totalTiles = Math.ceil(totalArea / tileArea);
              // Number of horizontal rows = wall height ÷ tile's vertical dimension
              const layerCount = Math.max(1, Math.ceil(wallHeight / tileVerticalInRoomUnit));
              tilesNeeded = totalTiles / layerCount;
            }
          }

          wallSelection.layers.push({
            layerNumber: layerNumber!,
            tileId: selection.tile_id,
            tilesNeeded
          });
        }
      }
    });

    wallSelections.forEach(ws => {
      ws.totalLayers = Math.max(ws.layers.length, 1);
      if (!ws.baseTileId && ws.layers.length > 0) {
        ws.baseTileId = ws.layers[0].tileId;
      }
    });

    setFloorTileSelections(prev => {
      const isEqual = JSON.stringify(prev) === JSON.stringify(floorSelections);
      return isEqual ? prev : floorSelections;
    });

    setWallTileSelections(prev => {
      const isEqual = JSON.stringify(prev) === JSON.stringify(wallSelections);
      return isEqual ? prev : wallSelections;
    });

    setSkirtingTileSelections(prev => {
      const isEqual = JSON.stringify(prev) === JSON.stringify(newSkirtingSelections);
      return isEqual ? prev : newSkirtingSelections;
    });
  }, [selections, rooms, tiles]);

  return {
    // Data
    tiles,
    customerProducts,
    productSelections,
    
    // Selections state
    floorTileSelections,
    setFloorTileSelections,
    wallTileSelections,
    setWallTileSelections,
    staircaseTileSelectionsState,
    setStaircaseTileSelectionsState,
    skirtingTileSelections,
    setSkirtingTileSelections,
    
    // Multi-select
    selectedFloorRooms,
    setSelectedFloorRooms,
    
    // Wastage
    wastagePercentage,
    setWastagePercentage,
    getWastagePercentage,
    
    // UI state
    showTileCatalog,
    setShowTileCatalog,
    showProductCatalog,
    setShowProductCatalog,
    catalogContext,
    setCatalogContext,
    showQuotationForm,
    setShowQuotationForm,
    showWallTileSelection,
    setShowWallTileSelection,
    showRoomPreview,
    setShowRoomPreview,
    
    // Derived
    floorRooms,
    wallRooms,
    skirtingRooms,
    isLoading,
  };
}
