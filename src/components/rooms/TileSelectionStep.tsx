
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Palette, Calculator, Package, DollarSign, ArrowLeft } from "lucide-react";
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

  const handleTileSelection = (roomId: string, tileId: string, checked: boolean) => {
    setTileSelections(prev => {
      const roomSelections = prev[roomId] || [];
      if (checked) {
        return { ...prev, [roomId]: [...roomSelections, tileId] };
      } else {
        return { ...prev, [roomId]: roomSelections.filter(id => id !== tileId) };
      }
    });
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
          <p className="text-gray-600">Choose tiles for each room and view calculations</p>
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
              <div key={room.id} className="space-y-3">
                <h4 className="font-medium text-gray-800">{room.name}</h4>
                <p className="text-sm text-gray-600">
                  Area: {(room.length * room.width).toFixed(2)} {room.unit}²
                </p>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {tiles.map(tile => (
                    <div key={tile.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${room.id}-${tile.id}`}
                        checked={(tileSelections[room.id] || []).includes(tile.id)}
                        onCheckedChange={(checked) => 
                          handleTileSelection(room.id, tile.id, checked as boolean)
                        }
                      />
                      <label 
                        htmlFor={`${room.id}-${tile.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {tile.name} ({tile.code}) - ₹{tile.price_per_sqm}/m²
                      </label>
                    </div>
                  ))}
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
