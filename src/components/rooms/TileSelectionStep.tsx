import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Percent, Plus, Trash2, Calculator, Package, IndianRupee, Layers, Copy, Minus, Eye, Check, PlusSquare, Ruler, Footprints } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { useStaircaseTileSelections, useSaveStaircaseTileSelection, useDeleteStaircaseTileSelection } from "@/hooks/useStaircases";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { WallTileSelectionPage } from "./WallTileSelectionPage";
import { FloorTilePreview } from "@/components/tiles/FloorTilePreview";
import { toast } from "sonner";
import { formatArea, decimalFeetToFeetInches } from "@/utils/unitConversions";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import {
  calculateTileRequirements,
  calculateGrandTotal,
  prepareQuotationItems,
  formatTileBreakdown,
  type FloorTileSelection,
  type WallTileSelection,
  type WallTileLayer,
  type StaircaseTileSelection as StaircaseTileSelectionType,
  calculateStaircaseTileRequirements,
  prepareStaircaseQuotationItems
} from "@/utils/tileCalculations";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import type { Staircase } from "@/hooks/useStaircases";

interface TileSelectionStepProps {
  customerId: string;
  rooms: Room[];
  staircases?: Staircase[];
  onBack: () => void;
}

// Updated Context to support multi-room selection and staircases
interface CatalogContext {
  roomId?: string;
  roomIds?: string[]; // For bulk selection
  staircaseId?: string;
  staircaseTileType?: 'step' | 'riser';
  isWallTile: boolean;
  layerNumber?: number;
}

export const TileSelectionStep = ({ customerId, rooms, staircases = [], onBack }: TileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const { data: staircaseSelections = [], isLoading: staircaseSelectionsLoading } = useStaircaseTileSelections(customerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  const saveStaircaseSelectionMutation = useSaveStaircaseTileSelection();
  const deleteStaircaseSelectionMutation = useDeleteStaircaseTileSelection();

  const [floorTileSelections, setFloorTileSelections] = useState<FloorTileSelection[]>([]);
  const [wallTileSelections, setWallTileSelections] = useState<WallTileSelection[]>([]);
  const [staircaseTileSelectionsState, setStaircaseTileSelectionsState] = useState<StaircaseTileSelectionType[]>([]);
  const [wastagePercentage, setWastagePercentage] = useState<string>("0");

  // State for multi-selection
  const [selectedFloorRooms, setSelectedFloorRooms] = useState<Set<string>>(new Set());

  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [catalogContext, setCatalogContext] = useState<CatalogContext | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showWallTileSelection, setShowWallTileSelection] = useState<{
    roomId: string;
    room: Room;
  } | null>(null);
  const [showFloorPreview, setShowFloorPreview] = useState<{
    room: Room;
    tile: Tile | null;
  } | null>(null);

  // Helper to format dimensions
  const formatTileDim = (l?: number, b?: number) => {
    if (!l || !b) return "";
    return `${l} × ${b} mm`;
  };

  useEffect(() => {
    console.log('📊 floorTileSelections changed:', floorTileSelections);
  }, [floorTileSelections]);

  const floorRooms = rooms.filter(room => room.room_type === "floor");
  const wallRooms = rooms.filter(room => room.room_type === "wall");

  // Load staircase tile selections from database
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

  useEffect(() => {
    if (selections.length === 0 && tiles.length === 0) return;

    const floorSelections: FloorTileSelection[] = [];
    const wallSelections: WallTileSelection[] = [];

    selections.forEach(selection => {
      const room = rooms.find(r => r.id === selection.room_id);
      if (!room) return;

      if (room.room_type === "floor") {
        const existingFloorSelection = floorSelections.find(
          fs => fs.roomId === selection.room_id && fs.tileId === selection.tile_id
        );
        if (!existingFloorSelection) {
          floorSelections.push({
            roomId: selection.room_id,
            tileId: selection.tile_id
          });
        }
      } else {
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

        const layerNumber = selection.layer_number || 1;
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
            layerNumber,
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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };
  // --- Helper for displaying multi-shape dimensions ---
  const renderRoomDimensions = (room: Room) => {
    const formatVal = (val: number | string) => {
      if (room.unit === 'feet') return decimalFeetToFeetInches(Number(val));
      return `${val} ${room.unit}`;
    };

    // 1. Check for Multi-Shape Data
    if (room.measurements && room.measurements.length > 0) {
      return (
        <div className="space-y-1 mt-1">
          <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <Layers className="h-3 w-3" />
            <span>{room.measurements.length} Shapes</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1 bg-gray-50 rounded border border-gray-100 p-1.5">
            {room.measurements.map((m, idx) => (
              <div key={idx} className="flex justify-between text-xs border-b border-dashed border-gray-200 last:border-0 pb-0.5 last:pb-0">
                <span className="text-gray-500 mr-2">#{idx + 1}:</span>
                <span className="font-mono font-medium text-gray-700">
                  {formatVal(m.length)} × {formatVal(m.width)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Total: {formatArea(calculateAreaInSquareFeet(
              room.room_type === 'wall' ? (room.wall_length || 0) : (room.length || 0),
              room.room_type === 'wall' ? (room.wall_height || 0) : (room.width || 0),
              room.unit
            ))}
          </p>
        </div>
      );
    }

    // 2. Fallback for Legacy Data
    const isFloor = room.room_type === "floor";
    const length = isFloor ? room.length : room.wall_length;
    const width = isFloor ? room.width : room.wall_height;

    return (
      <div>
        <p className="text-sm text-gray-600">
          {decimalFeetToFeetInches(length || 0)} × {decimalFeetToFeetInches(width || 0)}
        </p>
        <p className="text-xs text-gray-500">
          ({formatArea(calculateAreaInSquareFeet(length || 0, width || 0, room.unit))})
        </p>
      </div>
    );
  };


  // --- Multi-Select Handlers ---

  const toggleFloorRoomSelection = (roomId: string) => {
    const newSet = new Set(selectedFloorRooms);
    if (newSet.has(roomId)) {
      newSet.delete(roomId);
    } else {
      newSet.add(roomId);
    }
    setSelectedFloorRooms(newSet);
  };

  const handleBulkAddTile = () => {
    if (selectedFloorRooms.size === 0) {
      toast.error("Please select at least one room");
      return;
    }
    setCatalogContext({
      roomIds: Array.from(selectedFloorRooms),
      isWallTile: false
    });
    setShowTileCatalog(true);
  };

  const handleAddFloorTile = (roomId: string) => {
    const room = floorRooms.find(r => r.id === roomId);
    if (!room) return;
    setCatalogContext({
      roomId,
      isWallTile: false
    });
    setShowTileCatalog(true);
  };

  // Restored and Upgraded Auto Assign Logic
  const handleAutoAssignTile = async (tileId: string) => {
    console.log('🔵 handleAutoAssignTile START:', { tileId, catalogContext });

    if (!catalogContext) {
      console.error('No catalogContext available');
      toast.error('Room context not found');
      return;
    }

    const { roomId, roomIds, isWallTile } = catalogContext;

    // Determine target rooms (single or multiple)
    const targetRoomIds = roomIds && roomIds.length > 0 ? roomIds : (roomId ? [roomId] : []);

    if (targetRoomIds.length === 0) {
      toast.error("No rooms targeted for assignment");
      return;
    }

    if (!isWallTile) {
      // Filter out rooms that already have this tile to avoid duplicates
      const roomsToAdd: string[] = [];
      targetRoomIds.forEach(id => {
        const exists = floorTileSelections.find(fs => fs.roomId === id && fs.tileId === tileId);
        if (!exists) {
          roomsToAdd.push(id);
        }
      });

      if (roomsToAdd.length === 0) {
        toast.info("Tile already selected for all target rooms");
        return;
      }

      try {
        const newSelections = roomsToAdd.map(id => ({ roomId: id, tileId }));
        console.log('🔵 Adding selections:', newSelections);

        // Optimistic update
        setFloorTileSelections(prev => {
          const updated = [...prev, ...newSelections];
          return updated;
        });

        // Create complete selections payload for saving
        // (We need to send ALL current selections + new ones because the API likely replaces or we want consistency)
        const selectionsToSave: any[] = [];

        // Current selections + New selections
        [...floorTileSelections, ...newSelections].forEach(fs => {
          selectionsToSave.push({
            customer_id: customerId,
            room_id: fs.roomId,
            tile_id: fs.tileId
          });
        });

        // Include existing wall selections
        wallTileSelections.forEach(ws => {
          ws.layers.forEach(layer => {
            selectionsToSave.push({
              customer_id: customerId,
              room_id: ws.roomId,
              tile_id: layer.tileId,
              layer_number: layer.layerNumber
            });
          });
        });

        console.log('🔵 Calling save mutation with:', selectionsToSave);
        await saveSelectionsMutation.mutateAsync(selectionsToSave);

        const selectedTile = tiles.find(t => t.id === tileId);
        const tileName = selectedTile?.code || 'Tile';

        if (roomsToAdd.length === 1) {
          const roomName = rooms.find(r => r.id === roomsToAdd[0])?.name || 'Room';
          toast.success(`${tileName} assigned to ${roomName} successfully!`);
        } else {
          toast.success(`${tileName} assigned to ${roomsToAdd.length} rooms successfully!`);
        }

        // Clear selection after successful bulk add
        if (roomIds && roomIds.length > 0) {
          setSelectedFloorRooms(new Set());
        }

      } catch (error: any) {
        console.error('❌ Save failed:', error);

        console.log('🔄 Rolling back state...');
        setFloorTileSelections(prev => {
          // Remove the ones we just tried to add
          const rolledBack = prev.filter(fs =>
            !(roomsToAdd.includes(fs.roomId) && fs.tileId === tileId)
          );
          return rolledBack;
        });

        let errorMessage = "Failed to save tile assignment";
        if (error?.status === 400) errorMessage = "Invalid tile selection data";
        else if (error?.status === 401) errorMessage = "Authentication required";
        else if (error?.status >= 500) errorMessage = "Server error. Please try again.";

        toast.error(errorMessage);
        return;
      }
    }

    console.log('🔵 handleAutoAssignTile END - closing dialog');
    setShowTileCatalog(false);
    setCatalogContext(null);
  };

  const handleConfigureWallTiles = (roomId: string) => {
    const room = wallRooms.find(r => r.id === roomId);
    if (!room) return;

    let wallSelection = wallTileSelections.find(ws => ws.roomId === roomId);
    if (!wallSelection) {
      wallSelection = {
        roomId,
        baseTileId: null,
        layers: [],
        totalLayers: 0
      };
      setWallTileSelections(prev => [...prev, wallSelection!]);
    }
    setShowWallTileSelection({ roomId, room });
  };

  const calculateWallLayers = (roomId: string, baseTileId: string) => {
    const room = wallRooms.find(r => r.id === roomId);
    const baseTile = tiles.find(t => t.id === baseTileId);
    if (!room || !baseTile) return;

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

    const totalArea = wallHeight * wallLength;
    const tileArea = tileHeightInRoomUnit * tileLengthInRoomUnit;

    if (tileArea <= 0) return;

    const grandTotalTilesNeeded = Math.ceil(totalArea / tileArea);
    const layerCount = Math.max(1, Math.ceil(wallHeight / tileHeightInRoomUnit));
    const tilesPerLayer = grandTotalTilesNeeded / layerCount;

    const layers: WallTileLayer[] = [];
    for (let i = 1; i <= layerCount; i++) {
      layers.push({
        layerNumber: i,
        tileId: baseTileId,
        tilesNeeded: tilesPerLayer
      });
    }

    setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId
          ? { ...ws, baseTileId, layers, totalLayers: layerCount }
          : ws
      )
    );
  };

  const handleTileSelected = (tileId: string) => {
    if (!catalogContext) return;

    const { roomId, roomIds, isWallTile, layerNumber } = catalogContext;

    if (!isWallTile) {
      // --- BULK FLOOR TILE SELECTION ---
      if (roomIds && roomIds.length > 0) {
        const newSelections: FloorTileSelection[] = [];
        let addedCount = 0;

        roomIds.forEach(id => {
          // Check if tile already selected for this room
          const exists = floorTileSelections.find(fs => fs.roomId === id && fs.tileId === tileId);
          if (!exists) {
            newSelections.push({ roomId: id, tileId });
            addedCount++;
          }
        });

        if (addedCount > 0) {
          setFloorTileSelections(prev => [...prev, ...newSelections]);
          toast.success(`Tile added to ${addedCount} room${addedCount > 1 ? 's' : ''}`);
          // Optional: Clear selection after adding
          setSelectedFloorRooms(new Set());
        } else {
          toast.info("Selected tile is already present in all selected rooms");
        }
      }
      // --- SINGLE FLOOR TILE SELECTION (Fallback) ---
      else if (roomId) {
        const existingSelection = floorTileSelections.find(
          fs => fs.roomId === roomId && fs.tileId === tileId
        );
        if (existingSelection) {
          toast.error("This tile is already selected for this room");
        } else {
          setFloorTileSelections(prev => [...prev, { roomId, tileId }]);
          toast.success("Floor tile added to room");
        }
      }
    } else if (roomId) {
      // --- WALL TILE SELECTION ---
      const wallSelection = wallTileSelections.find(ws => ws.roomId === roomId);

      if (!wallSelection || !wallSelection.baseTileId) {
        calculateWallLayers(roomId, tileId);
        toast.success("Base wall tile selected and layers calculated");
      } else if (layerNumber !== undefined) {
        setWallTileSelections(prev =>
          prev.map(ws =>
            ws.roomId === roomId
              ? {
                ...ws,
                layers: ws.layers.map(layer =>
                  layer.layerNumber === layerNumber
                    ? { ...layer, tileId }
                    : layer
                )
              }
              : ws
          )
        );
        toast.success(`Tile updated for layer ${layerNumber}`);
      }
    }

    // Handle staircase tile selection
    if (catalogContext?.staircaseId && catalogContext?.staircaseTileType) {
      handleStaircaseTileSelected(tileId);
      return;
    }

    setShowTileCatalog(false);
    setCatalogContext(null);
  };

  const handleRemoveFloorTile = async (roomId: string, tileId: string) => {
    try {
      await deleteSelectionMutation.mutateAsync({ roomId, tileId });
      setFloorTileSelections(prev =>
        prev.filter(fs => !(fs.roomId === roomId && fs.tileId === tileId))
      );
      toast.success("Floor tile removed");
    } catch (error) {
      toast.error("Failed to remove tile");
    }
  };

  const handleChangeLayerTile = (roomId: string, layerNumber: number) => {
    setCatalogContext({ roomId, isWallTile: true, layerNumber });
    setShowTileCatalog(true);
  };

  const handleCopyTileToAllLayers = (roomId: string, tileId: string) => {
    setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId
          ? {
            ...ws,
            layers: ws.layers.map(layer => ({ ...layer, tileId }))
          }
          : ws
      )
    );
    toast.success("Tile copied to all layers");
  };

  const handleDeleteLayer = (roomId: string, layerNumber: number) => {
    setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId
          ? {
            ...ws,
            layers: ws.layers.filter(layer => layer.layerNumber !== layerNumber),
            totalLayers: Math.max(1, ws.totalLayers - 1)
          }
          : ws
      )
    );
    toast.success(`Layer ${layerNumber} deleted`);
  };

  const handleSaveSelections = async (newSelections?: FloorTileSelection[]) => {
    const selectionsToUse = newSelections || floorTileSelections;
    const selectionsToSave: { customer_id: string; room_id: string; tile_id: string; layer_number?: number }[] = [];

    selectionsToUse.forEach(fs => {
      selectionsToSave.push({
        customer_id: customerId,
        room_id: fs.roomId,
        tile_id: fs.tileId
      });
    });

    wallTileSelections.forEach(ws => {
      ws.layers.forEach(layer => {
        selectionsToSave.push({
          customer_id: customerId,
          room_id: ws.roomId,
          tile_id: layer.tileId,
          layer_number: layer.layerNumber
        });
      });
    });

    try {
      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      toast.success("Tile selections saved successfully!");
    } catch (error) {
      console.error("Error saving selections:", error);
      toast.error("Failed to save selections. Please try again.");
      throw error;
    }
  };

  const getWastagePercentage = (): number => {
    const parsed = parseFloat(wastagePercentage);
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(15, parsed));
  };

  const handleGenerateQuotation = () => {
    const hasFloorTiles = floorTileSelections.length > 0;
    const hasWallTiles = wallTileSelections.some(ws => ws.layers.length > 0);
    const hasStaircaseTiles = staircaseTileSelectionsState.some(s => s.stepTileId || s.riserTileId);

    if (!hasFloorTiles && !hasWallTiles && !hasStaircaseTiles) {
      toast.error("Please select tiles for at least one room or staircase before generating quotation");
      return;
    }
    setShowQuotationForm(true);
  };

  // Handler for staircase tile selection
  const handleSelectStaircaseTile = (staircaseId: string, tileType: 'step' | 'riser') => {
    setCatalogContext({
      staircaseId,
      staircaseTileType: tileType,
      isWallTile: false
    });
    setShowTileCatalog(true);
  };

  const handleStaircaseTileSelected = async (tileId: string) => {
    if (!catalogContext?.staircaseId || !catalogContext?.staircaseTileType) return;

    const { staircaseId, staircaseTileType } = catalogContext;

    // Update local state
    setStaircaseTileSelectionsState(prev => {
      const existing = prev.find(s => s.staircaseId === staircaseId);
      if (existing) {
        return prev.map(s =>
          s.staircaseId === staircaseId
            ? { ...s, [staircaseTileType === 'step' ? 'stepTileId' : 'riserTileId']: tileId }
            : s
        );
      } else {
        return [...prev, {
          staircaseId,
          stepTileId: staircaseTileType === 'step' ? tileId : undefined,
          riserTileId: staircaseTileType === 'riser' ? tileId : undefined
        }];
      }
    });

    // Save to database
    try {
      await saveStaircaseSelectionMutation.mutateAsync({
        staircase_id: staircaseId,
        customer_id: customerId,
        tile_id: tileId,
        tile_type: staircaseTileType
      });
      toast.success(`${staircaseTileType === 'step' ? 'Step' : 'Riser'} tile assigned successfully!`);
    } catch (error) {
      console.error('Error saving staircase tile:', error);
      toast.error('Failed to save tile selection');
    }

    setShowTileCatalog(false);
    setCatalogContext(null);
  };

  const calculations = calculateTileRequirements(
    floorTileSelections,
    wallTileSelections,
    rooms,
    tiles,
    getWastagePercentage()
  );

  const staircaseCalculations = calculateStaircaseTileRequirements(
    staircaseTileSelectionsState,
    staircases,
    tiles,
    getWastagePercentage()
  );

  const grandTotal = calculateGrandTotal(calculations) +
    staircaseCalculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  const prepareQuotationData = () => {
    const roomItems = prepareQuotationItems(
      floorTileSelections,
      wallTileSelections,
      rooms,
      tiles,
      getWastagePercentage()
    );

    const staircaseItems = prepareStaircaseQuotationItems(
      staircaseTileSelectionsState,
      staircases,
      tiles,
      getWastagePercentage()
    );

    return [...roomItems, ...staircaseItems];
  };

  const styles = {
    tilesContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 20px)',
      gridTemplateRows: 'repeat(3, 20px)',
      gap: '8px',
      justifyContent: 'center',
      marginBottom: '24px',
    },
    tile: {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      animation: 'tileAnimation 1.2s ease-in-out infinite',
    },
    tileBlue: { backgroundColor: '#3B82F6' },
    tileBeige: { backgroundColor: '#F5F5DC' },
    tileLight: { backgroundColor: '#93C5FD' },
    loadingText: { color: '#6B7280', fontSize: '16px', fontWeight: '500', marginBottom: '16px' },
    progressBar: { width: '200px', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', overflow: 'hidden', margin: '0 auto' },
    progressFill: { height: '100%', width: '100%', background: 'linear-gradient(90deg, #3B82F6, #93C5FD, #3B82F6)', backgroundSize: '200% 100%', animation: 'progressFlow 2s linear infinite' },
  };

  if (tilesLoading || selectionsLoading || staircaseSelectionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div style={styles.tilesContainer}>
            {[...Array(12)].map((_, index) => (
              <div
                key={index}
                style={{
                  ...styles.tile,
                  ...styles[`tile${index % 3 === 0 ? 'Blue' : index % 3 === 1 ? 'Beige' : 'Light'}`],
                  animationDelay: `${index * 0.08}s`
                }}
              />
            ))}
          </div>
          <p style={styles.loadingText}>Loading...</p>
          <div style={styles.progressBar}>
            <div style={styles.progressFill}></div>
          </div>
        </div>
      </div>
    );
  }

  if (showWallTileSelection) {
    const wallSelection = wallTileSelections.find(ws => ws.roomId === showWallTileSelection.roomId) || {
      roomId: showWallTileSelection.roomId,
      baseTileId: null,
      layers: [],
      totalLayers: 0
    };

    return (
      <WallTileSelectionPage
        room={showWallTileSelection.room}
        wallSelection={wallSelection}
        tiles={tiles}
        onBack={() => setShowWallTileSelection(null)}
        onUpdateSelection={(selection) => {
          setWallTileSelections(prev =>
            prev.map(ws =>
              ws.roomId === selection.roomId ? selection : ws
            ).concat(
              prev.find(ws => ws.roomId === selection.roomId) ? [] : [selection]
            )
          );
        }}
      />
    );
  }

  if (showQuotationForm) {
    return (
      <QuotationForm
        preSelectedCustomerId={customerId}
        selectedRoomsData={prepareQuotationData()}
        wastagePercentage={getWastagePercentage()}
        onBack={() => setShowQuotationForm(false)}
        onSuccess={() => {
          setShowQuotationForm(false);
          toast.success("Quotation generated successfully!");
          onBack();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">Select Tiles for Rooms</h2>
          <p className="text-gray-600">Configure floor and wall tiles with advanced layering options</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Rooms Section */}
        <div className="space-y-6 lg:col-span-2">
          {/* Floor Rooms */}
          {floorRooms.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-green-600" />
                  Floor Rooms ({floorRooms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {floorRooms.map(room => {
                  const roomSelections = floorTileSelections.filter(fs => fs.roomId === room.id);
                  const isSelected = selectedFloorRooms.has(room.id);

                  return (
                    <div
                      key={room.id}
                      className={`border rounded-lg p-4 transition-colors ${isSelected ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-green-50/50 hover:border-green-300'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* CUSTOM BIG CHECKBOX for Selection */}
                          <div
                            onClick={() => toggleFloorRoomSelection(room.id)}
                            className={`h-6 w-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all shadow-sm ${isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 bg-white hover:border-blue-400"
                              }`}
                            title={isSelected ? "Deselect Room" : "Select Room to Add Tile"}
                          >
                            {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                          </div>

                          <div>
                            <h4 className="font-semibold text-base text-gray-800">{room.name}</h4>

                            {/* UPDATED: Use renderRoomDimensions for detailed multi-shape display */}
                            {renderRoomDimensions(room)}

                          </div>
                        </div>

                        {roomSelections.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFloorPreview({ room, tile: tiles.find(t => t.id === roomSelections[0].tileId) })}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        )}
                      </div>

                      {roomSelections.length > 0 ? (
                        <div className="space-y-3 pl-9">
                          {roomSelections.map((fs, index) => {
                            const tile = tiles.find(t => t.id === fs.tileId);
                            return tile ? (
                              <div key={`${fs.roomId}-${fs.tileId}-${index}`} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold">{tile.code}</p>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      {formatTileDim(tile.size_length, tile.size_breadth)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">{tile.code}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveFloorTile(room.id, fs.tileId)}
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic pl-9">No tiles selected</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Wall Rooms */}
          {wallRooms.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Wall Rooms ({wallRooms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wallRooms.map(room => {
                  const wallSelection = wallTileSelections.find(ws => ws.roomId === room.id);
                  return (
                    <div key={room.id} className="border rounded-lg p-4 bg-blue-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-base">{room.name}</h4>

                          {/* UPDATED: Use renderRoomDimensions for detailed multi-shape display */}
                          {renderRoomDimensions(room)}

                        </div>
                        <Button
                          onClick={() => handleConfigureWallTiles(room.id)}
                          className="gap-2"
                        >
                          <Layers className="h-4 w-4" />
                          Configure
                        </Button>
                      </div>

                      {wallSelection && wallSelection.layers.length > 0 ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500">Layers:</span>
                              <span className="font-semibold ml-2">{wallSelection.layers.length}</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="text-gray-500">Total Tiles:</span>
                              <span className="font-semibold ml-2">
                                {wallSelection.layers.reduce((sum, layer) => sum + layer.tilesNeeded, 0).toFixed(0)}
                              </span>
                            </div>
                          </div>

                          {/* List Unique Tiles for Wall Room */}
                          {(() => {
                            const uniqueTileIds = Array.from(new Set(wallSelection.layers.map(l => l.tileId)));
                            const uniqueTiles = uniqueTileIds.map(id => tiles.find(t => t.id === id)).filter(Boolean);

                            if (uniqueTiles.length > 0) {
                              return (
                                <div className="mt-3 pt-3 border-t border-blue-200/50 space-y-2">
                                  <p className="text-xs font-medium text-blue-800 mb-2">Selected Tiles:</p>
                                  {uniqueTiles.map(tile => (tile &&
                                    <div key={tile.id} className="bg-white p-2 rounded border border-blue-100 flex justify-between items-center">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">{tile.code}</span>
                                          <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                            {formatTileDim(tile.size_length, tile.size_breadth)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500">{tile.code}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}

                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No wall tiles configured</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}


          {/* Staircases Section */}
          {staircases.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Footprints className="h-5 w-5 text-orange-600" />
                  Staircases ({staircases.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staircases.map(staircase => {
                  const selection = staircaseTileSelectionsState.find(s => s.staircaseId === staircase.id);
                  const stepTile = selection?.stepTileId ? tiles.find(t => t.id === selection?.stepTileId) : null;
                  const riserTile = selection?.riserTileId ? tiles.find(t => t.id === selection?.riserTileId) : null;

                  return (
                    <div key={staircase.id} className="border rounded-lg p-4 bg-orange-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-base text-gray-800">{staircase.name}</h4>
                          <p className="text-sm text-gray-600">
                            {staircase.number_of_steps} Steps, {staircase.number_of_risers} Risers
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Steps Selection */}
                        <div className="flex items-center justify-between bg-white p-2 rounded border border-orange-100">
                          <div className="flex items-center gap-2">
                            <div className="bg-orange-100 p-1.5 rounded">
                              <Footprints className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Steps</p>
                              {stepTile ? (
                                <p className="text-xs text-blue-600 font-medium">{stepTile.code}</p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">Not selected</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectStaircaseTile(staircase.id, 'step')}
                          >
                            {stepTile ? 'Change' : 'Select'}
                          </Button>
                        </div>

                        {/* Risers Selection */}
                        <div className="flex items-center justify-between bg-white p-2 rounded border border-orange-100">
                          <div className="flex items-center gap-2">
                            <div className="bg-orange-100 p-1.5 rounded">
                              <Layers className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Risers</p>
                              {riserTile ? (
                                <p className="text-xs text-blue-600 font-medium">{riserTile.code}</p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">Not selected</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectStaircaseTile(staircase.id, 'riser')}
                          >
                            {riserTile ? 'Change' : 'Select'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary & Actions */}
        <div className="lg:col-span-1 space-y-6">

          {/* NEW GLOBAL ADD TILE BUTTON */}
          {floorRooms.length > 0 && (
            <Button
              onClick={handleBulkAddTile}
              disabled={selectedFloorRooms.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2 shadow-md py-6 text-lg transition-all transform hover:-translate-y-0.5"
            >
              <PlusSquare className="h-5 w-5" />
              {selectedFloorRooms.size === 0
                ? "Select Rooms to Add Tile"
                : `Add Tile to ${selectedFloorRooms.size} Rooms`}
            </Button>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-green-600" />
                Summary & Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Wastage Percentage */}
              <div>
                <Label htmlFor="wastage" className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4" />
                  Wastage Percentage (0-15%)
                </Label>
                <Input
                  id="wastage"
                  type="number" // UPDATED: Changed to number
                  inputMode="numeric"
                  min="0"
                  max="15"
                  step="0.1"
                  value={wastagePercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Keep validation to ensure strictly 0-15 range
                    const numValue = parseFloat(value);
                    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 15)) {
                      setWastagePercentage(value);
                    }
                  }}
                  onFocus={handleInputFocus} // UPDATED: Select all on focus
                  placeholder="Enter 0-15"
                  className="text-center"
                />
              </div>

              {/* Calculations Summary */}
              {calculations.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Total Amount:</span>
                      <span className="font-bold text-green-600 text-xl">₹{grandTotal.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-600">Includes {getWastagePercentage()}% wastage</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Breakdown:</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {calculations.map((calc, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex-1">
                              <span className="font-medium truncate">{calc.tile.code}</span>
                              {calc.isWallTile && calc.wallLayers && calc.wallLayers.length > 0 && (
                                <span className="text-gray-500 text-xs ml-2">
                                  (Layer{calc.wallLayers.length > 1 ? 's' : ''}: {calc.wallLayers.sort((a, b) => a - b).join(', ')})
                                </span>
                              )}
                            </div>
                            <Badge variant={calc.isWallTile ? "secondary" : "default"} className="text-xs">
                              {calc.isWallTile ? "Wall" : "Floor"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <p className="text-gray-500">Tiles Required</p>
                              <p className="font-medium">
                                {formatTileBreakdown(
                                  calc.rawTilesNeeded,
                                  calc.fullBoxes,
                                  calc.leftoverTiles,
                                  parseInt(calc.tile.pieces_per_box?.toString() || '1'),
                                  getWastagePercentage()
                                )}
                              </p>
                            </div>

                            <div className="text-center">
                              <p className="text-gray-500">Boxes</p>
                              <p className="font-medium">{calc.boxesNeeded}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500">Amount</p>
                              <p className="font-medium">₹{calc.totalPrice.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Staircase Breakdown */}
                  {staircaseCalculations.length > 0 && (
                    <div className="space-y-2 pt-2 border-t mt-2">
                      <h4 className="text-sm font-semibold text-orange-800">Staircases:</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {staircaseCalculations.map((calc, index) => (
                          <div key={`stair-${index}`} className="bg-orange-50/50 p-2 rounded text-xs border border-orange-100">
                            <p className="font-semibold text-orange-900 mb-1">{calc.staircase.name}</p>

                            {calc.stepTile && (
                              <div className="mb-2 pl-2 border-l-2 border-orange-200">
                                <p className="text-gray-600">Step: <span className="font-medium text-gray-900">{calc.stepTile.tile.code}</span></p>
                                <div className="flex justify-between text-gray-500 mt-0.5">
                                  <span>{calc.stepTile.tilesNeeded} tiles ({calc.stepTile.boxesNeeded} boxes)</span>
                                  <span>₹{calc.stepTile.totalPrice.toLocaleString()}</span>
                                </div>
                              </div>
                            )}

                            {calc.riserTile && (
                              <div className="pl-2 border-l-2 border-orange-200">
                                <p className="text-gray-600">Riser: <span className="font-medium text-gray-900">{calc.riserTile.tile.code}</span></p>
                                <div className="flex justify-between text-gray-500 mt-0.5">
                                  <span>{calc.riserTile.tilesNeeded} tiles ({calc.riserTile.boxesNeeded} boxes)</span>
                                  <span>₹{calc.riserTile.totalPrice.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Calculator className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Select tiles to see calculations</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={() => handleSaveSelections()}
                  disabled={floorTileSelections.length === 0 && wallTileSelections.length === 0}
                  className="w-full"
                  size="lg"
                >
                  Save Selections
                </Button>
                <Button
                  onClick={handleGenerateQuotation}
                  disabled={calculations.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  Generate Quotation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showTileCatalog} onOpenChange={setShowTileCatalog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {catalogContext?.roomIds
                ? `Select Tile for ${catalogContext.roomIds.length} Rooms`
                : catalogContext
                  ? `Select Tile for Room`
                  : 'Select Tiles'
              }
            </DialogTitle>
          </DialogHeader>
          <TileCatalog
            isSelectionMode={true}
            onTileSelect={handleTileSelected}
            autoAssignmentContext={null}
            onAutoAssignment={handleAutoAssignTile}
            onNavigateBack={() => {
              setShowTileCatalog(false);
              setCatalogContext(null);
            }}
          />
        </DialogContent>
      </Dialog>


      <FloorTilePreview
        isOpen={!!showFloorPreview}
        onClose={() => setShowFloorPreview(null)}
        tile={showFloorPreview?.tile || null}
        area={showFloorPreview ? calculateAreaInSquareFeet(showFloorPreview.room.length, showFloorPreview.room.width, showFloorPreview.room.unit) : 0}
        unit="ft"
      />
    </div >
  );
};
