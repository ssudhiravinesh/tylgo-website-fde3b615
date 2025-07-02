
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Layers, Calculator } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface WallTileSelectionStepProps {
  customerId: string;
  rooms: Room[];
  onBack: () => void;
}

interface WallDimensions {
  height: number;
  length: number;
  unit: string;
}

interface LayerSelection {
  layerNumber: number;
  tileId: string;
}

interface WallSelections {
  [roomId: string]: {
    dimensions: WallDimensions;
    layers: LayerSelection[];
  };
}

export const WallTileSelectionStep = ({ customerId, rooms, onBack }: WallTileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  
  const [wallSelections, setWallSelections] = useState<WallSelections>({});
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedLayerNumber, setSelectedLayerNumber] = useState<number | null>(null);

  const handleDimensionChange = (roomId: string, field: keyof WallDimensions, value: number | string) => {
    setWallSelections(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        dimensions: {
          ...prev[roomId]?.dimensions || { height: 0, length: 0, unit: 'feet' },
          [field]: value
        }
      }
    }));
  };

  const calculateLayers = (roomId: string): number => {
    const selection = wallSelections[roomId];
    if (!selection?.dimensions?.height) return 0;
    
    // Assume each layer is 1 foot high (standard tile height)
    const layerHeight = 1; // feet
    return Math.ceil(selection.dimensions.height / layerHeight);
  };

  const handleSelectTileForLayer = (roomId: string, layerNumber: number) => {
    setSelectedRoomId(roomId);
    setSelectedLayerNumber(layerNumber);
    setShowTileCatalog(true);
  };

  const handleTileSelected = (tileId: string) => {
    if (!selectedRoomId || selectedLayerNumber === null) return;

    setWallSelections(prev => {
      const roomSelections = prev[selectedRoomId] || { 
        dimensions: { height: 0, length: 0, unit: 'feet' }, 
        layers: [] 
      };
      
      const existingLayerIndex = roomSelections.layers.findIndex(l => l.layerNumber === selectedLayerNumber);
      const newLayers = [...roomSelections.layers];
      
      if (existingLayerIndex >= 0) {
        newLayers[existingLayerIndex] = { layerNumber: selectedLayerNumber, tileId };
      } else {
        newLayers.push({ layerNumber: selectedLayerNumber, tileId });
      }

      return {
        ...prev,
        [selectedRoomId]: {
          ...roomSelections,
          layers: newLayers
        }
      };
    });

    setShowTileCatalog(false);
    setSelectedRoomId(null);
    setSelectedLayerNumber(null);
    
    const tile = tiles.find(t => t.id === tileId);
    toast.success(`Tile "${tile?.name}" selected for layer ${selectedLayerNumber}`);
  };

  const removeTileFromLayer = (roomId: string, layerNumber: number) => {
    setWallSelections(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        layers: prev[roomId]?.layers.filter(l => l.layerNumber !== layerNumber) || []
      }
    }));
  };

  const calculateWallTileRequirements = () => {
    const calculations: Array<{
      roomId: string;
      roomName: string;
      wallDimensions: WallDimensions;
      layerCalculations: Array<{
        layerNumber: number;
        tile: Tile;
        tilesNeeded: number;
        boxesNeeded: number;
        totalPrice: number;
      }>;
      totalPrice: number;
    }> = [];

    Object.entries(wallSelections).forEach(([roomId, selection]) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room || !selection.dimensions?.height || !selection.dimensions?.length) return;

      const layerCalculations: any[] = [];
      let roomTotalPrice = 0;

      selection.layers.forEach(layer => {
        const tile = tiles.find(t => t.id === layer.tileId);
        if (!tile || !tile.size_length || !tile.size_breadth || !tile.pieces_per_box || !tile.price_per_box) return;

        // Calculate tile dimensions in feet
        const tileLengthFt = tile.size_length / 304.8; // mm to ft
        const tileBreadthFt = tile.size_breadth / 304.8; // mm to ft
        
        // Calculate how many tiles needed for this layer (horizontal across the wall length)
        const tilesPerRow = Math.ceil(selection.dimensions.length / tileBreadthFt);
        const tilesNeeded = tilesPerRow;
        
        // Calculate boxes needed
        const boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
        
        // Calculate total price for this layer
        const totalPrice = boxesNeeded * tile.price_per_box;
        
        layerCalculations.push({
          layerNumber: layer.layerNumber,
          tile,
          tilesNeeded,
          boxesNeeded,
          totalPrice
        });
        
        roomTotalPrice += totalPrice;
      });

      if (layerCalculations.length > 0) {
        calculations.push({
          roomId,
          roomName: room.name,
          wallDimensions: selection.dimensions,
          layerCalculations,
          totalPrice: roomTotalPrice
        });
      }
    });

    return calculations;
  };

  const wallCalculations = calculateWallTileRequirements();
  const grandTotal = wallCalculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  if (tilesLoading) {
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
          Back to Floor Tiles
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Select Wall Tiles</h2>
          <p className="text-gray-600">Configure wall dimensions and select tiles for different layers</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wall Configuration */}
        <div className="space-y-4">
          {rooms.map((room) => {
            const layerCount = calculateLayers(room.id);
            const roomSelection = wallSelections[room.id];
            
            return (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{room.name} - Wall Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Wall Dimensions */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`height-${room.id}`}>Height (ft)</Label>
                      <Input
                        id={`height-${room.id}`}
                        type="number"
                        value={roomSelection?.dimensions?.height || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleDimensionChange(room.id, 'height', value);
                        }}
                        placeholder="Enter height"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`length-${room.id}`}>Length (ft)</Label>
                      <Input
                        id={`length-${room.id}`}
                        type="number"
                        value={roomSelection?.dimensions?.length || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleDimensionChange(room.id, 'length', value);
                        }}
                        placeholder="Enter length"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        <Layers className="h-4 w-4 inline mr-1" />
                        {layerCount} layers
                      </div>
                    </div>
                  </div>

                  {/* Layer Selection */}
                  {layerCount > 0 && (
                    <div className="space-y-2">
                      <Label>Layer Tile Selection</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Array.from({ length: layerCount }, (_, index) => {
                          const layerNumber = index + 1;
                          const layerTile = roomSelection?.layers?.find(l => l.layerNumber === layerNumber);
                          const tile = layerTile ? tiles.find(t => t.id === layerTile.tileId) : null;
                          
                          return (
                            <div key={layerNumber} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Layer {layerNumber}</Badge>
                                {tile && (
                                  <span className="text-sm font-medium">{tile.name}</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSelectTileForLayer(room.id, layerNumber)}
                                >
                                  {tile ? 'Change' : 'Select'} Tile
                                </Button>
                                {tile && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTileFromLayer(room.id, layerNumber)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Calculations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Wall Tile Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wallCalculations.length > 0 ? (
              <div className="space-y-4">
                {wallCalculations.map((calc) => (
                  <div key={calc.roomId} className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-2">{calc.roomName}</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Wall: {calc.wallDimensions.height} × {calc.wallDimensions.length} ft
                    </p>
                    
                    <div className="space-y-2">
                      {calc.layerCalculations.map((layer) => (
                        <div key={layer.layerNumber} className="flex justify-between text-sm">
                          <span>Layer {layer.layerNumber}: {layer.tile.name}</span>
                          <span className="font-medium">
                            {layer.boxesNeeded} boxes - ₹{layer.totalPrice.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Room Total:</span>
                        <span>₹{calc.totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="text-green-600">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Configure wall dimensions and select tiles to see calculations</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TileCatalog
        isOpen={showTileCatalog}
        onClose={() => {
          setShowTileCatalog(false);
          setSelectedRoomId(null);
          setSelectedLayerNumber(null);
        }}
        onTileSelect={handleTileSelected}
        selectedTileIds={[]}
      />
    </div>
  );
};
