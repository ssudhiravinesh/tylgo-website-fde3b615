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

    selections.forEach(selection => {
      const room = rooms.find(r => r.id === selection.room_id);
      if (!room) return;

      const layerNumber = selection.layer_number;
      const isWallSelection = layerNumber !== null && layerNumber !== undefined && layerNumber > 0;

      if (!isWallSelection && room.has_floor) {
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
            const wallLength = room.wall_length || room.length || 0;

            let tileHeightInRoomUnit: number;
            let tileLengthInRoomUnit: number;

            if (room.unit === "feet") {
              tileHeightInRoomUnit = (baseTile.size_length || 0) / 304.8;
              tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 304.8;
            } else if (room.unit === "metre") {
              tileHeightInRoomUnit = (baseTile.size_length || 0) / 1000;
              tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 1000;
            } else {
              tileHeightInRoomUnit = baseTile.size_length || 0;
              tileLengthInRoomUnit = baseTile.size_breadth || 0;
            }

            if (tileHeightInRoomUnit > 0 && tileLengthInRoomUnit > 0) {
              const totalArea = wallHeight * wallLength;
              const tileArea = tileHeightInRoomUnit * tileLengthInRoomUnit;
              const totalTiles = Math.ceil(totalArea / tileArea);
              const layerCount = Math.max(1, Math.ceil(wallHeight / tileHeightInRoomUnit));
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
    isLoading,
  };
}
