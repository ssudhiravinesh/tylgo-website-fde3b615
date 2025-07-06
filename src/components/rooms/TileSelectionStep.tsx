
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Percent, ArrowRight } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QRScanner } from "@/components/qr/QRScanner";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { WallTileConfigurationStep, type WallTileData } from "./WallTileConfigurationStep";
import { TileSelectionCard } from "./TileSelectionCard";
import { TileCalculationsCard } from "./TileCalculationsCard";
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
  const [wallTileData, setWallTileData] = useState<WallTileData[]>([]);
  const [wastagePercentage, setWastagePercentage] = useState<number>(10);
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [selectedRoomForTile, setSelectedRoomForTile] = useState<string | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showWallTileConfiguration, setShowWallTileConfiguration] = useState(false);

  useEffect(() => {
    // Initialize selections from database
    const initialSelections: { [roomId: string]: string[] } = {};
    selections.forEach(selection => {
      if (!initialSelections[selection.room_id]) {
        initialSelections[selection.room_id] = [];
      }
      initialSelections[selection.room_id].push(selection.tile_id);
    });
    setTileSelections(initialSelections);
  }, [selections]);

  const handleChooseTile = (roomId: string) => {
    console.log('Opening tile catalog for room:', roomId);
    setSelectedRoomForTile(roomId);
    setShowTileCatalog(true);
  };

  const handleScanQR = (roomId: string) => {
    setSelectedRoomForTile(roomId);
    setIsQRScannerOpen(true);
  };

  const handleQRScanned = (tileCode: string) => {
    if (!selectedRoomForTile) return;

    const tile = tiles.find(t => t.code === tileCode);
    if (!tile) {
      toast.error(`No tile found with code: ${tileCode}`);
      setIsQRScannerOpen(false);
      setSelectedRoomForTile(null);
      return;
    }

    const roomSelections = tileSelections[selectedRoomForTile] || [];
    if (roomSelections.includes(tile.id)) {
      toast.error("This tile is already selected for this room");
      setIsQRScannerOpen(false);
      setSelectedRoomForTile(null);
      return;
    }

    setTileSelections(prev => ({
      ...prev,
      [selectedRoomForTile]: [...roomSelections, tile.id]
    }));
    
    toast.success(`Tile "${tile.name}" (${tile.code}) added to room`);
    setIsQRScannerOpen(false);
    setSelectedRoomForTile(null);
  };

  const handleTileSelected = (tileId: string) => {
    console.log('Tile selected:', tileId, 'for room:', selectedRoomForTile);
    
    if (!selectedRoomForTile) {
      console.error('No room selected for tile');
      return;
    }

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
    console.log('Closing tile catalog');
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

  const handleSaveSelections = async () => {
    const selectionsToSave: { customer_id: string; room_id: string; tile_id: string }[] = [];
    
    Object.entries(tileSelections).forEach(([roomId, tileIds]) => {
      tileIds.forEach(tileId => {
        selectionsToSave.push({
          customer_id: customerId,
          room_id: roomId,
          tile_id: tileId
        });
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

    // Wall tiles calculations - using the same calculation logic as floor tiles
    const wallTileGroups: { [tileId: string]: { data: WallTileData[], totalArea: number, layers: number[] } } = {};
    
    wallTileData.forEach(wallTile => {
      const tileId = wallTile.tileId;
      if (!wallTileGroups[tileId]) {
        wallTileGroups[tileId] = {
          data: [],
          totalArea: 0,
          layers: []
        };
      }
      wallTileGroups[tileId].data.push(wallTile);
      wallTileGroups[tileId].totalArea += wallTile.quantity;
      if (!wallTileGroups[tileId].layers.includes(wallTile.layerNumber)) {
        wallTileGroups[tileId].layers.push(wallTile.layerNumber);
      }
    });

    Object.entries(wallTileGroups).forEach(([tileId, group]) => {
      const tile = tiles.find(t => t.id === tileId);
      if (!tile) return;

      const wallTileKey = `${tileId}_wall`;
      const roomIds = [...new Set(group.data.map(d => d.roomId))];
      const wallRooms = rooms.filter(r => roomIds.includes(r.id));

      tileCalculations[wallTileKey] = {
        tile,
        rooms: wallRooms,
        totalArea: group.totalArea,
        tilesNeeded: 0,
        boxesNeeded: 0,
        totalPrice: 0,
        isWallTile: true,
        wallLayers: group.layers
      };
    });

    // Calculate tiles, boxes, and pricing using the same logic for both floor and wall tiles
    Object.values(tileCalculations).forEach(calc => {
      const tile = calc.tile;
      
      if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
        // Convert tile dimensions from mm to feet
        const tileLengthFt = (tile.size_length || 0) / 304.8;
        const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          // Calculate basic tiles needed for the area
          const basicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
          
          // Add wastage percentage
          calc.tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
          
          // Calculate boxes and price
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

  const handleWallTileDataChange = (data: WallTileData[]) => {
    setWallTileData(data);
  };

  const handleGenerateQuotation = () => {
    const hasFloorTiles = Object.keys(tileSelections).length > 0;
    const hasWallTiles = wallTileData.length > 0;
    
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
    wallTileData.forEach(wallTile => {
      roomsData.push({
        roomId: wallTile.roomId,
        tileId: wallTile.tileId,
        quantity: wallTile.quantity,
        wastagePercentage: wastagePercentage,
        isWallTile: true,
        layerNumber: wallTile.layerNumber,
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

  if (showWallTileConfiguration) {
    return (
      <WallTileConfigurationStep
        customerId={customerId}
        rooms={rooms}
        onBack={() => setShowWallTileConfiguration(false)}
        onWallTileDataChange={handleWallTileDataChange}
      />
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
          <h2 className="text-2xl font-bold text-gray-800">Select Floor Tiles for Rooms</h2>
          <p className="text-gray-600">Choose tiles from the catalog or scan QR codes for each room</p>
        </div>
        <Button 
          onClick={() => setShowWallTileConfiguration(true)}
          className="gap-2"
        >
          Configure Wall Tiles
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TileSelectionCard
          rooms={rooms}
          tiles={tiles}
          tileSelections={tileSelections}
          onChooseTile={handleChooseTile}
          onScanQR={handleScanQR}
          onRemoveTile={removeTileSelection}
          onSaveSelections={handleSaveSelections}
          onGenerateQuotation={handleGenerateQuotation}
          isDeleting={deleteSelectionMutation.isPending}
        />

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

      <TileCatalog
        isOpen={showTileCatalog}
        onClose={handleCloseTileCatalog}
        onTileSelect={handleTileSelected}
        selectedTileIds={selectedRoomForTile ? (tileSelections[selectedRoomForTile] || []) : []}
      />

      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => {
          setIsQRScannerOpen(false);
          setSelectedRoomForTile(null);
        }}
        onScan={handleQRScanned}
      />
    </div>
  );
};
