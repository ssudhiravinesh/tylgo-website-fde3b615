
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Calculator, Package, DollarSign, ArrowLeft, X, MousePointer, QrCode, FileText } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QRScanner } from "@/components/qr/QRScanner";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { toast } from "sonner";
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
}

export const TileSelectionStep = ({ customerId, rooms, onBack }: TileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  
  const [tileSelections, setTileSelections] = useState<{ [roomId: string]: string[] }>({});
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

    // Find tile by code
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
      // Delete from database
      await deleteSelectionMutation.mutateAsync({ roomId, tileId });
      
      // Update local state
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

    // Group rooms by tile selection
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
            totalPrice: 0
          };
        }

        const roomArea = room.length * room.width;
        tileCalculations[tileId].rooms.push(room);
        tileCalculations[tileId].totalArea += roomArea;
      });
    });

    // Calculate tiles, boxes, and pricing
    Object.values(tileCalculations).forEach(calc => {
      const tileArea = (calc.tile.size_length / 1000) * (calc.tile.size_breadth / 1000); // Convert mm to m²
      calc.tilesNeeded = Math.ceil(calc.totalArea / tileArea);
      calc.boxesNeeded = Math.ceil(calc.tilesNeeded / 10); // Assuming 10 tiles per box
      calc.totalPrice = calc.totalArea * calc.tile.price_per_sqm;
    });

    return Object.values(tileCalculations);
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
    onBack(); // Navigate back to rooms or wherever appropriate
  };

  const prepareQuotationData = () => {
    const calculations = calculateTileRequirements();
    return calculations.map(calc => ({
      room_id: calc.rooms[0]?.id || "",
      tile_id: calc.tile.id,
      room_name: calc.rooms.map(r => r.name).join(", "),
      tile_name: calc.tile.name,
      room_area: calc.totalArea,
      tile_price: calc.tile.price_per_sqm,
    }));
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
        customerId={customerId}
        roomTileSelections={prepareQuotationData()}
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

      {/* Tile Selection */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Tile Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {rooms.map(room => (
              <div key={room.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800">{room.name}</h4>
                  <Badge variant="outline">
                    {(room.length * room.width).toFixed(2)} {room.unit}²
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleChooseTile(room.id)}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <MousePointer className="h-4 w-4" />
                    Choose Tile
                  </Button>
                  <Button
                    onClick={() => handleScanQR(room.id)}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    Scan QR
                  </Button>
                </div>

                {/* Selected tiles for this room */}
                <div className="space-y-2">
                  {(tileSelections[room.id] || []).map(tileId => {
                    const tile = tiles.find(t => t.id === tileId);
                    if (!tile) return null;
                    
                    return (
                      <div key={tileId} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {tile.code}
                          </Badge>
                          <span className="text-sm">{tile.name}</span>
                          <span className="text-xs text-gray-500">₹{tile.price_per_sqm}/m²</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTileSelection(room.id, tileId)}
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          disabled={deleteSelectionMutation.isPending}
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="flex gap-2">
              <Button onClick={handleSaveSelections} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Save Selections
              </Button>
              <Button 
                onClick={handleGenerateQuotation} 
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={Object.keys(tileSelections).length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Quotation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calculations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Tile Requirements & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {calculations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Select tiles for rooms to see calculations
              </p>
            ) : (
              <>
                {calculations.map((calc, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{calc.tile.name}</h4>
                      <Badge variant="outline">{calc.tile.code}</Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p><strong>Rooms:</strong> {calc.rooms.map(r => r.name).join(", ")}</p>
                      <p><strong>Total Area:</strong> {calc.totalArea.toFixed(2)} m²</p>
                      <p className="flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        <strong>Tiles Needed:</strong> {calc.tilesNeeded}
                      </p>
                      <p className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <strong>Boxes Needed:</strong> {calc.boxesNeeded}
                      </p>
                      <p className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <strong>Total Price:</strong> ₹{calc.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-blue-800">Grand Total</h4>
                    <p className="text-xl font-bold text-blue-800">₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
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
