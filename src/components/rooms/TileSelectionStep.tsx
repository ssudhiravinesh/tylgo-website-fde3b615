
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Palette, Calculator, Package, DollarSign, ArrowLeft, QrCode, Plus, X } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections } from "@/hooks/useRooms";
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
  
  const [tileSelections, setTileSelections] = useState<{ [roomId: string]: string[] }>({});
  const [tileCodeInputs, setTileCodeInputs] = useState<{ [roomId: string]: string }>({});

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

  const addTileByCode = (roomId: string, tileCode: string) => {
    const tile = tiles.find(t => t.code.toLowerCase() === tileCode.toLowerCase());
    if (!tile) {
      toast.error(`Tile with code "${tileCode}" not found`);
      return;
    }

    const roomSelections = tileSelections[roomId] || [];
    if (roomSelections.includes(tile.id)) {
      toast.error("This tile is already selected for this room");
      return;
    }

    setTileSelections(prev => ({
      ...prev,
      [roomId]: [...roomSelections, tile.id]
    }));

    setTileCodeInputs(prev => ({
      ...prev,
      [roomId]: ""
    }));

    toast.success(`Tile "${tile.name}" added to room`);
  };

  const removeTileSelection = (roomId: string, tileId: string) => {
    setTileSelections(prev => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter(id => id !== tileId)
    }));
  };

  const handleKeyPress = (roomId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const tileCode = tileCodeInputs[roomId]?.trim();
      if (tileCode) {
        addTileByCode(roomId, tileCode);
      }
    }
  };

  const handleScanQR = () => {
    toast.info("QR scanning functionality would be implemented here");
    // In a real implementation, this would open a camera/QR scanner
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

  const calculations = calculateTileRequirements();
  const grandTotal = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  if (tilesLoading || selectionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <p className="text-gray-600">Enter tile codes or scan QR codes to select tiles</p>
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
            <div className="flex gap-2">
              <Button onClick={handleScanQR} className="gap-2 bg-green-600 hover:bg-green-700">
                <QrCode className="h-4 w-4" />
                Scan QR Code
              </Button>
            </div>

            {rooms.map(room => (
              <div key={room.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800">{room.name}</h4>
                  <Badge variant="outline">
                    {(room.length * room.width).toFixed(2)} {room.unit}²
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter tile code..."
                    value={tileCodeInputs[room.id] || ""}
                    onChange={(e) => setTileCodeInputs(prev => ({
                      ...prev,
                      [room.id]: e.target.value
                    }))}
                    onKeyPress={(e) => handleKeyPress(room.id, e)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      const tileCode = tileCodeInputs[room.id]?.trim();
                      if (tileCode) {
                        addTileByCode(room.id, tileCode);
                      }
                    }}
                    size="sm"
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add
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
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <Button onClick={handleSaveSelections} className="w-full bg-blue-600 hover:bg-blue-700">
              Save Selections
            </Button>
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
    </div>
  );
};
