
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Percent } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QRScanner } from "@/components/qr/QRScanner";
import { QuotationForm } from "@/components/quotations/QuotationForm";
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
  effectiveArea: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
}

export const TileSelectionStep = ({ customerId, rooms, onBack }: TileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  
  const [tileSelections, setTileSelections] = useState<{ [roomId: string]: string[] }>({});
  const [wastagePercentage, setWastagePercentage] = useState<number>(10);
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [selectedRoomForTile, setSelectedRoomForTile] = useState<string | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [showQuotationForm, setShowQuotationForm] = useState(false);

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
    if (!selectedRoomForTile) return;

    const roomSelections = tileSelections[selectedRoomForTile] || [];
    if (roomSelections.includes(tileId)) {
      toast.error("This tile is already selected for this room");
      setShowTileCatalog(false);
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
            effectiveArea: 0,
            tilesNeeded: 0,
            boxesNeeded: 0,
            totalPrice: 0
          };
        }

        // Convert room area to square feet before adding
        const roomAreaInSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
        tileCalculations[tileId].rooms.push(room);
        tileCalculations[tileId].totalArea += roomAreaInSqFt;
      });
    });

    Object.values(tileCalculations).forEach(calc => {
      // Calculate effective area with wastage
      calc.effectiveArea = calc.totalArea * (1 + (wastagePercentage / 100));
      
      // Convert tile dimensions from mm to feet for area calculation
      const tileLengthInFeet = (calc.tile.size_length || 0) / 304.8; // mm to feet
      const tileBreadthInFeet = (calc.tile.size_breadth || 0) / 304.8; // mm to feet
      const tileAreaInSqFt = tileLengthInFeet * tileBreadthInFeet;
      
      if (tileAreaInSqFt > 0) {
        calc.tilesNeeded = Math.ceil(calc.effectiveArea / tileAreaInSqFt);
        calc.boxesNeeded = Math.ceil(calc.tilesNeeded / (calc.tile.pieces_per_box || 10));
      }
      
      calc.totalPrice = calc.effectiveArea * calc.tile.price_per_sqm;
    });

    return Object.values(tileCalculations);
  };

  const handleWastageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setWastagePercentage(value);
    }
  };

  const handleGenerateQuotation = () => {
    if (Object.keys(tileSelections).length === 0) {
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
    }> = [];

    Object.entries(tileSelections).forEach(([roomId, tileIds]) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      tileIds.forEach(tileId => {
        // Convert room area to square feet before calculating
        const roomAreaInSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
        const effectiveArea = roomAreaInSqFt * (1 + (wastagePercentage / 100));
        roomsData.push({
          roomId: roomId,
          tileId: tileId,
          quantity: effectiveArea,
          wastagePercentage: wastagePercentage,
        });
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
        onBack={handleBackFromQuotation}
        onSuccess={handleQuotationSuccess}
      />
    );
  }

  if (showTileCatalog) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setShowTileCatalog(false)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Room Selection
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Choose Tile</h2>
            <p className="text-gray-600">
              Select a tile for: {rooms.find(r => r.id === selectedRoomForTile)?.name}
            </p>
          </div>
        </div>
        <TileCatalog 
          onTileSelected={handleTileSelected}
          showAssignButton={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Select Tiles for Rooms</h2>
          <p className="text-gray-600">Choose tiles from the catalog or scan QR codes for each room</p>
        </div>
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
                Wastage Percentage (%)
              </Label>
            </div>
            <Input
              id="wastage"
              type="number"
              value={wastagePercentage}
              onChange={handleWastageChange}
              min="0"
              step="0.1"
              className="w-full"
              placeholder="Enter wastage percentage"
            />
            <p className="text-xs text-gray-500 mt-1">
              Additional area to account for cutting and installation waste
            </p>
          </div>

          <TileCalculationsCard
            calculations={calculations}
            grandTotal={grandTotal}
            wastagePercentage={wastagePercentage}
          />
        </div>
      </div>

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
