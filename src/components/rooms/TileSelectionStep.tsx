import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Percent, Save, FileText } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { TileSelectionCard } from "./TileSelectionCard";
import { TileCalculationsCard } from "./TileCalculationsCard";
import { WallTileSelector } from "./WallTileSelector";
import { toast } from "sonner";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface TileSelectionStepProps {
  customerId: string;
  rooms: Room[];
  onBack: () => void;
}

interface TileCalculation {
  tile: Tile;
  rooms: Room[];
  totalArea: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
  isWallTile?: boolean;
  wallLayers?: number[];
}

export const TileSelectionStep = ({ customerId, rooms, onBack }: TileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  
  const [tileSelections, setTileSelections] = useState<{ [roomId: string]: string[] }>({});
  const [wallTileSelections, setWallTileSelections] = useState<{ [key: string]: string }>({});
  const [wastagePercentage, setWastagePercentage] = useState<number>(10);
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [selectedRoomForTile, setSelectedRoomForTile] = useState<string | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);

  // Separate floor and wall rooms
  const floorRooms = rooms.filter(room => room.room_type === 'floor');
  const wallRooms = rooms.filter(room => room.room_type === 'wall');

  useEffect(() => {
    // Initialize selections from database
    const initialFloorSelections: { [roomId: string]: string[] } = {};
    const initialWallSelections: { [key: string]: string } = {};
    
    selections.forEach(selection => {
      const room = rooms.find(r => r.id === selection.room_id);
      if (!room) return;

      if (room.room_type === 'floor') {
        if (!initialFloorSelections[selection.room_id]) {
          initialFloorSelections[selection.room_id] = [];
        }
        initialFloorSelections[selection.room_id].push(selection.tile_id);
      } else if (room.room_type === 'wall' && selection.layer_number) {
        const key = `${selection.room_id}_${selection.layer_number}`;
        initialWallSelections[key] = selection.tile_id;
      }
    });
    
    setTileSelections(initialFloorSelections);
    setWallTileSelections(initialWallSelections);
  }, [selections, rooms]);

  const handleChooseTile = (roomId: string) => {
    setSelectedRoomForTile(roomId);
    setShowTileCatalog(true);
  };

  const handleTileSelected = (tileId: string) => {
    if (!selectedRoomForTile) return;

    const roomSelections = tileSelections[selectedRoomForTile] || [];
    if (roomSelections.includes(tileId)) {
      toast.error("This tile is already selected for this room");
      setShowTileCatalog(false);
      setSelectedRoomForTile(null);
      return;
    }

    const tile = tiles.find(t => t.id === tileId);
    if (tile) {
      setTileSelections(prev => ({
        ...prev,
        [selectedRoomForTile]: [...roomSelections, tileId]
      }));
      
      toast.success(`Tile "${tile.name}" added to room`);
    }
    
    setShowTileCatalog(false);
    setSelectedRoomForTile(null);
  };

  const handleCloseTileCatalog = () => {
    setShowTileCatalog(false);
    setSelectedRoomForTile(null);
  };

  const removeTileSelection = async (roomId: string, tileId: string) => {
    try {
      await deleteSelectionMutation.mutateAsync({ roomId, tileId });
      
      setTileSelections(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter(id => id !== tileId)
      }));
      
      toast.success("Tile removed from room");
    } catch (error) {
      console.error("Error removing tile selection:", error);
      toast.error("Failed to remove tile selection");
    }
  };

  const handleWallTileSelect = (roomId: string, layerNumber: number, tileId: string) => {
    const key = `${roomId}_${layerNumber}`;
    setWallTileSelections(prev => ({
      ...prev,
      [key]: tileId
    }));
  };

  const handleWallTileRemove = async (roomId: string, layerNumber: number, tileId: string) => {
    try {
      await deleteSelectionMutation.mutateAsync({ roomId, tileId, layerNumber });
      
      const key = `${roomId}_${layerNumber}`;
      setWallTileSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[key];
        return newSelections;
      });
      
      toast.success("Wall tile removed from layer");
    } catch (error) {
      console.error("Error removing wall tile selection:", error);
      toast.error("Failed to remove wall tile selection");
    }
  };

  const handleSaveSelections = async () => {
    const selectionsToSave: { customer_id: string; room_id: string; tile_id: string; layer_number?: number }[] = [];
    
    // Floor tile selections
    Object.entries(tileSelections).forEach(([roomId, tileIds]) => {
      tileIds.forEach(tileId => {
        selectionsToSave.push({
          customer_id: customerId,
          room_id: roomId,
          tile_id: tileId
        });
      });
    });

    // Wall tile selections
    Object.entries(wallTileSelections).forEach(([key, tileId]) => {
      const [roomId, layerNumber] = key.split('_');
      selectionsToSave.push({
        customer_id: customerId,
        room_id: roomId,
        tile_id: tileId,
        layer_number: parseInt(layerNumber)
      });
    });

    try {
      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      toast.success("Tile selections saved successfully!");
    } catch (error) {
      console.error("Error saving selections:", error);
      toast.error("Failed to save selections");
    }
  };

  const calculateTileRequirements = (): TileCalculation[] => {
    const tileCalculations: { [tileId: string]: TileCalculation } = {};

    // Floor tiles calculations
    Object.entries(tileSelections).forEach(([roomId, tileIds]) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      tileIds.forEach(tileId => {
        const tile = tiles.find(t => t.id === tileId);
        if (!tile) return;

        if (!tileCalculations[tileId]) {
          tileCalculations[tileId] = {
            tile,
            rooms: [],
            totalArea: 0,
            tilesNeeded: 0,
            boxesNeeded: 0,
            totalPrice: 0,
            isWallTile: false
          };
        }

        const roomAreaInSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
        tileCalculations[tileId].rooms.push(room);
        tileCalculations[tileId].totalArea += roomAreaInSqFt;
      });
    });

    // Wall tiles calculations
    Object.entries(wallTileSelections).forEach(([key, tileId]) => {
      const [roomId, layerNumber] = key.split('_');
      const room = rooms.find(r => r.id === roomId);
      const tile = tiles.find(t => t.id === tileId);
      
      if (!room || !tile || !room.wall_height || !room.wall_length) return;

      const wallTileKey = `${tileId}_wall`;
      
      if (!tileCalculations[wallTileKey]) {
        tileCalculations[wallTileKey] = {
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

      // Calculate layer area
      let tileHeightInRoomUnit = tile.size_length / 1000; // Convert mm to meters
      
      // Convert to room's unit if needed
      if (room.unit === "feet") {
        tileHeightInRoomUnit = tileHeightInRoomUnit * 3.28084;
      } else if (room.unit === "inches") {
        tileHeightInRoomUnit = tileHeightInRoomUnit * 39.3701;
      } else if (room.unit === "mm") {
        tileHeightInRoomUnit = tile.size_length;
      }

      const layerHeight = Math.min(tileHeightInRoomUnit, room.wall_height - (parseInt(layerNumber) - 1) * tileHeightInRoomUnit);
      const layerAreaInSqFt = calculateAreaInSquareFeet(layerHeight, room.wall_length, room.unit);
      
      if (!tileCalculations[wallTileKey].rooms.find(r => r.id === roomId)) {
        tileCalculations[wallTileKey].rooms.push(room);
      }
      
      tileCalculations[wallTileKey].totalArea += layerAreaInSqFt;
      
      if (!tileCalculations[wallTileKey].wallLayers?.includes(parseInt(layerNumber))) {
        tileCalculations[wallTileKey].wallLayers?.push(parseInt(layerNumber));
      }
    });

    // Calculate tiles, boxes, and pricing
    Object.values(tileCalculations).forEach(calc => {
      const tile = calc.tile;
      
      if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
        // Convert tile dimensions from mm to feet
        const tileLengthFt = (tile.size_length || 0) / 304.8;
        const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          const basicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
          calc.tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
          calc.boxesNeeded = Math.ceil(calc.tilesNeeded / tile.pieces_per_box);
          calc.totalPrice = calc.boxesNeeded * parseFloat(tile.price_per_box.toString());
        }
      }
    });

    return Object.values(tileCalculations);
  };

  const handleWastageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 15) {
      setWastagePercentage(value);
    }
  };

  const handleGenerateQuotation = () => {
    const hasFloorTiles = Object.keys(tileSelections).length > 0;
    const hasWallTiles = Object.keys(wallTileSelections).length > 0;
    
    if (!hasFloorTiles && !hasWallTiles) {
      toast.error("Please select tiles for at least one room before generating quotation");
      return;
    }
    setShowQuotationForm(true);
  };

  const handleBackFromQuotation = () => {
    setShowQuotationForm(false);
  };

  const handleQuotationSuccess = () => {
    setShowQuotationForm(false);
    toast.success("Quotation generated successfully!");
    onBack();
  };

  const prepareQuotationData = () => {
    const roomsData: Array<{
      roomId: string;
      tileId: string;
      quantity: number;
      wastagePercentage: number;
      isWallTile?: boolean;
      layerNumber?: number;
    }> = [];

    // Floor tiles data
    Object.entries(tileSelections).forEach(([roomId, tileIds]) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      tileIds.forEach(tileId => {
        const roomAreaInSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
        roomsData.push({
          roomId: roomId,
          tileId: tileId,
          quantity: roomAreaInSqFt,
          wastagePercentage: wastagePercentage,
          isWallTile: false,
        });
      });
    });

    // Wall tiles data
    Object.entries(wallTileSelections).forEach(([key, tileId]) => {
      const [roomId, layerNumber] = key.split('_');
      const room = rooms.find(r => r.id === roomId);
      const tile = tiles.find(t => t.id === tileId);
      
      if (!room || !tile || !room.wall_height || !room.wall_length) return;
      
      // Calculate layer area
      let tileHeightInRoomUnit = tile.size_length / 1000; // Convert mm to meters
      
      // Convert to room's unit if needed
      if (room.unit === "feet") {
        tileHeightInRoomUnit = tileHeightInRoomUnit * 3.28084;
      } else if (room.unit === "inches") {
        tileHeightInRoomUnit = tileHeightInRoomUnit * 39.3701;
      } else if (room.unit === "mm") {
        tileHeightInRoomUnit = tile.size_length;
      }

      const layerHeight = Math.min(tileHeightInRoomUnit, room.wall_height - (parseInt(layerNumber) - 1) * tileHeightInRoomUnit);
      const layerAreaInSqFt = calculateAreaInSquareFeet(layerHeight, room.wall_length, room.unit);
      
      roomsData.push({
        roomId: roomId,
        tileId: tileId,
        quantity: layerAreaInSqFt,
        wastagePercentage: wastagePercentage,
        isWallTile: true,
        layerNumber: parseInt(layerNumber),
      });
    });

    return roomsData;
  };

  const calculations = calculateTileRequirements();
  const grandTotal = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  if (tilesLoading || selectionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showQuotationForm) {
    return (
      <QuotationForm
        preSelectedCustomerId={customerId}
        selectedRoomsData={prepareQuotationData()}
        wastagePercentage={wastagePercentage}
        onBack={handleBackFromQuotation}
        onSuccess={handleQuotationSuccess}
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
          <p className="text-gray-600">Choose tiles from the catalog for each room</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Floor Rooms */}
          {floorRooms.length > 0 && (
            <TileSelectionCard
              rooms={floorRooms}
              tiles={tiles}
              tileSelections={tileSelections}
              onChooseTile={handleChooseTile}
              onRemoveTile={removeTileSelection}
              isDeleting={deleteSelectionMutation.isPending}
            />
          )}

          {/* Wall Rooms */}
          {wallRooms.map(room => (
            <WallTileSelector
              key={room.id}
              room={room}
              tiles={tiles}
              selectedTiles={Object.fromEntries(
                Object.entries(wallTileSelections)
                  .filter(([key]) => key.startsWith(`${room.id}_`))
                  .map(([key, value]) => [key.split('_')[1], value])
              )}
              onTileSelect={(layerNumber, tileId) => handleWallTileSelect(room.id, layerNumber, tileId)}
              onTileRemove={(layerNumber, tileId) => handleWallTileRemove(room.id, layerNumber, tileId)}
              wastagePercentage={wastagePercentage}
            />
          ))}
        </div>

        <div className="space-y-4">
          {/* Wastage Percentage Input */}
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="h-4 w-4 text-blue-600" />
              <Label htmlFor="wastage" className="text-sm font-medium">
                Wastage Percentage (%) - Max 15%
              </Label>
            </div>
            <Input
              id="wastage"
              type="number"
              value={wastagePercentage}
              onChange={handleWastageChange}
              min="0"
              max="15"
              className="w-full"
              placeholder="Enter wastage percentage (0-15)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Additional tiles to account for cutting and installation waste (Maximum 15%)
            </p>
          </div>

          <TileCalculationsCard
            calculations={calculations}
            grandTotal={grandTotal}
            wastagePercentage={wastagePercentage}
          />
        </div>
      </div>

      {/* Action Buttons at Bottom */}
      <div className="flex gap-2 pt-4 border-t">
        <Button 
          onClick={handleSaveSelections}
          className="flex-1 gap-2"
        >
          <Save className="h-4 w-4" />
          Save Selections
        </Button>
        
        <Button 
          onClick={handleGenerateQuotation}
          variant="outline"
          className="flex-1 gap-2"
        >
          <FileText className="h-4 w-4" />
          Generate Quotation
        </Button>
      </div>

      <TileCatalog
        isOpen={showTileCatalog}
        onClose={handleCloseTileCatalog}
        onTileSelect={handleTileSelected}
        selectedTileIds={selectedRoomForTile ? (tileSelections[selectedRoomForTile] || []) : []}
      />
    </div>
  );
};
