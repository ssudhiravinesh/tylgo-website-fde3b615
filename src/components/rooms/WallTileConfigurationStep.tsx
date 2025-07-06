import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calculator, Package, IndianRupee, Layers, Copy, Percent } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { FeetInchInput } from "@/components/ui/feet-inch-input";

export interface WallTileData {
  roomId: string;
  tileId: string;
  layerNumber: number;
  quantity: number;
  tilesPerLayer: number;
  totalTiles: number;
  wastagePercentage: number;
}

interface WallTileConfigurationStepProps {
  customerId: string;
  rooms: Room[];
  onBack: () => void;
  onWallTileDataChange: (data: WallTileData[]) => void;
}

interface LayerConfiguration {
  layerNumber: number;
  tileId: string | null;
  tilesNeeded: number;
}

export const WallTileConfigurationStep = ({ 
  customerId, 
  rooms, 
  onBack, 
  onWallTileDataChange 
}: WallTileConfigurationStepProps) => {
  const { data: tiles = [] } = useTiles();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [wallHeight, setWallHeight] = useState<number>(0);
  const [wallLength, setWallLength] = useState<number>(0);
  const [dimensionUnit, setDimensionUnit] = useState<"metre" | "feet">("metre");
  const [heightValue, setHeightValue] = useState<string>("");
  const [lengthValue, setLengthValue] = useState<string>("");
  const [baseTileId, setBaseTileId] = useState<string>("");
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [layers, setLayers] = useState<LayerConfiguration[]>([]);
  const [wastagePercentage, setWastagePercentage] = useState<number>(10);
  const [step, setStep] = useState<"room" | "dimensions" | "base-tile" | "layers">("room");

  // Convert feet string to metres for calculations
  const convertFeetStringToMetres = (feetString: string): number => {
    if (!feetString) return 0;
    const decimalFeet = parseFloat(feetString);
    return decimalFeet * 0.3048;
  };

  // Calculate dimensions based on unit
  const getCalculationDimensions = () => {
    if (dimensionUnit === "feet") {
      return {
        height: convertFeetStringToMetres(heightValue),
        length: convertFeetStringToMetres(lengthValue)
      };
    }
    return {
      height: wallHeight,
      length: wallLength
    };
  };

  const calculateLayers = () => {
    const baseTile = tiles.find(t => t.id === baseTileId);
    if (!baseTile) return;

    const { height, length } = getCalculationDimensions();
    
    // Convert tile dimensions from mm to metres
    const tileHeightM = (baseTile.size_length || 0) / 1000;
    const tileLengthM = (baseTile.size_breadth || 0) / 1000;
    
    if (tileHeightM <= 0 || tileLengthM <= 0) {
      toast.error("Invalid tile dimensions");
      return;
    }

    const layerCount = Math.ceil(height / tileHeightM);
    const tilesPerLayer = Math.ceil(length / tileLengthM);
    
    const newLayers: LayerConfiguration[] = [];
    for (let i = 1; i <= layerCount; i++) {
      newLayers.push({
        layerNumber: i,
        tileId: baseTileId,
        tilesNeeded: tilesPerLayer
      });
    }
    
    setLayers(newLayers);
    setStep("layers");
  };

  const handleLayerTileChange = (layerNumber: number, tileId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.layerNumber === layerNumber 
        ? { ...layer, tileId }
        : layer
    ));
  };

  const copyTileToAllLayers = (tileId: string) => {
    setLayers(prev => prev.map(layer => ({ ...layer, tileId })));
    toast.success("Tile copied to all layers");
  };

  const calculateWallTileRequirements = () => {
    const wallTileData: WallTileData[] = [];
    const selectedRoom = rooms.find(r => r.id === selectedRoomId);
    
    if (!selectedRoom) return { wallTileData, totalPrice: 0 };

    const { height, length } = getCalculationDimensions();
    const baseTile = tiles.find(t => t.id === baseTileId);
    
    if (!baseTile) return { wallTileData, totalPrice: 0 };

    // Convert tile dimensions from mm to metres for calculation
    const tileHeightM = (baseTile.size_length || 0) / 1000;
    const tileLengthM = (baseTile.size_breadth || 0) / 1000;
    
    if (tileHeightM <= 0 || tileLengthM <= 0) {
      return { wallTileData, totalPrice: 0 };
    }

    const tilesPerLayer = Math.ceil(length / tileLengthM);
    
    layers.forEach(layer => {
      if (layer.tileId) {
        const tile = tiles.find(t => t.id === layer.tileId);
        if (tile) {
          // Calculate area for this layer in square feet for consistency
          const layerAreaSqFt = (height / layers.length) * length * 10.764; // Convert m² to sq ft
          
          wallTileData.push({
            roomId: selectedRoomId,
            tileId: layer.tileId,
            layerNumber: layer.layerNumber,
            quantity: layerAreaSqFt,
            tilesPerLayer: tilesPerLayer,
            totalTiles: tilesPerLayer,
            wastagePercentage: wastagePercentage
          });
        }
      }
    });

    // Calculate total price
    let totalPrice = 0;
    const tileCalculations: { [tileId: string]: { tiles: number; boxes: number; price: number } } = {};
    
    wallTileData.forEach(data => {
      const tile = tiles.find(t => t.id === data.tileId);
      if (tile && tile.pieces_per_box && tile.price_per_box) {
        if (!tileCalculations[data.tileId]) {
          tileCalculations[data.tileId] = { tiles: 0, boxes: 0, price: 0 };
        }
        
        // Add wastage to tiles
        const tilesWithWastage = Math.ceil(data.totalTiles * (1 + wastagePercentage / 100));
        tileCalculations[data.tileId].tiles += tilesWithWastage;
      }
    });
    
    // Calculate boxes and price for each tile type
    Object.entries(tileCalculations).forEach(([tileId, calc]) => {
      const tile = tiles.find(t => t.id === tileId);
      if (tile && tile.pieces_per_box && tile.price_per_box) {
        calc.boxes = Math.ceil(calc.tiles / tile.pieces_per_box);
        calc.price = calc.boxes * parseFloat(tile.price_per_box.toString());
        totalPrice += calc.price;
      }
    });

    return { wallTileData, totalPrice, tileCalculations };
  };

  const handleSaveWallConfiguration = () => {
    const { wallTileData } = calculateWallTileRequirements();
    onWallTileDataChange(wallTileData);
    toast.success("Wall tile configuration saved!");
    onBack();
  };

  const handleWastageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 15) {
      setWastagePercentage(value);
    }
  };

  const { wallTileData, totalPrice, tileCalculations } = calculateWallTileRequirements();

  if (step === "room") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-2xl font-bold text-gray-800">Configure Wall Tiles - Select Room</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Room for Wall Tiles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="room-select">Choose Room</Label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => setStep("dimensions")} 
              disabled={!selectedRoomId}
              className="w-full"
            >
              Next - Enter Wall Dimensions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "dimensions") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setStep("room")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-2xl font-bold text-gray-800">Configure Wall Tiles - Wall Dimensions</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter Wall Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Measurement Unit</Label>
              <Select value={dimensionUnit} onValueChange={(value: "metre" | "feet") => setDimensionUnit(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metre">Metres</SelectItem>
                  <SelectItem value="feet">Feet & Inches</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dimensionUnit === "metre" ? (
              <>
                <div>
                  <Label htmlFor="wall-height">Wall Height (metres)</Label>
                  <Input
                    id="wall-height"
                    type="number"
                    step="0.01"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(parseFloat(e.target.value) || 0)}
                    placeholder="Enter height in metres"
                  />
                </div>
                <div>
                  <Label htmlFor="wall-length">Wall Length (metres)</Label>
                  <Input
                    id="wall-length"
                    type="number"
                    step="0.01"
                    value={wallLength}
                    onChange={(e) => setWallLength(parseFloat(e.target.value) || 0)}
                    placeholder="Enter length in metres"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Wall Height</Label>
                  <FeetInchInput
                    value={heightValue}
                    onChange={setHeightValue}
                    placeholder="8 0"
                  />
                </div>
                <div>
                  <Label>Wall Length</Label>
                  <FeetInchInput
                    value={lengthValue}
                    onChange={setLengthValue}
                    placeholder="20 0"
                  />
                </div>
              </>
            )}

            <Button 
              onClick={() => setStep("base-tile")} 
              disabled={
                dimensionUnit === "metre" 
                  ? (wallHeight <= 0 || wallLength <= 0)
                  : (!heightValue || !lengthValue)
              }
              className="w-full"
            >
              Next - Select Base Tile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "base-tile") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setStep("dimensions")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-2xl font-bold text-gray-800">Configure Wall Tiles - Select Base Tile</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Base Wall Tile</CardTitle>
            <p className="text-sm text-gray-600">
              This tile will be used to calculate layers and can be customized per layer later.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowTileCatalog(true)}
              variant="outline"
              className="w-full"
            >
              Choose Base Tile from Catalog
            </Button>

            {baseTileId && (
              <div className="p-4 border rounded-lg bg-gray-50">
                {(() => {
                  const selectedTile = tiles.find(t => t.id === baseTileId);
                  return selectedTile ? (
                    <div>
                      <h4 className="font-semibold">{selectedTile.name}</h4>
                      <p className="text-sm text-gray-600">Code: {selectedTile.code}</p>
                      <p className="text-sm text-gray-600">
                        Size: {selectedTile.size_length}mm × {selectedTile.size_breadth}mm
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <Button 
              onClick={calculateLayers} 
              disabled={!baseTileId}
              className="w-full"
            >
              Calculate Layers & Continue
            </Button>
          </CardContent>
        </Card>

        <TileCatalog
          isOpen={showTileCatalog}
          onClose={() => setShowTileCatalog(false)}
          onTileSelect={(tileId) => {
            setBaseTileId(tileId);
            setShowTileCatalog(false);
          }}
          selectedTileIds={baseTileId ? [baseTileId] : []}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setStep("base-tile")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">Configure Wall Tiles - Layer Configuration</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Layer Configuration ({layers.length} layers)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {layers.map((layer, index) => {
                const selectedTile = tiles.find(t => t.id === layer.tileId);
                return (
                  <div key={layer.layerNumber} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Layer {layer.layerNumber}</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowTileCatalog(true)}
                        >
                          Choose Tile
                        </Button>
                        {selectedTile && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyTileToAllLayers(layer.tileId!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {selectedTile && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium">{selectedTile.name}</p>
                        <p>Code: {selectedTile.code}</p>
                        <p>Tiles needed: {layer.tilesNeeded}</p>
                        {selectedTile.pieces_per_box && (
                          <p>Boxes: {Math.ceil(layer.tilesNeeded * (1 + wastagePercentage / 100) / selectedTile.pieces_per_box)}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Wastage Percentage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="wastage">Wastage (%) - Max 15%</Label>
                <Input
                  id="wastage"
                  type="number"
                  value={wastagePercentage}
                  onChange={handleWastageChange}
                  min="0"
                  max="15"
                  placeholder="Enter wastage percentage"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Wall Tile Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tileCalculations && Object.keys(tileCalculations).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(tileCalculations).map(([tileId, calc]) => {
                    const tile = tiles.find(t => t.id === tileId);
                    return tile ? (
                      <div key={tileId} className="border rounded-lg p-3 bg-gray-50">
                        <h4 className="font-semibold text-sm">{tile.name}</h4>
                        <p className="text-xs text-gray-600">Code: {tile.code}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div>
                            <p className="text-gray-600">Tiles</p>
                            <p className="font-medium">{calc.tiles}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Boxes</p>
                            <p className="font-medium">{calc.boxes}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Price</p>
                            <p className="font-medium">₹{calc.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })}
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Wall Tiles:</span>
                      <span className="font-bold text-green-600">₹{totalPrice.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Includes {wastagePercentage}% wastage
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center">Configure layers to see summary</p>
              )}
            </CardContent>
          </Card>

          <Button 
            onClick={handleSaveWallConfiguration}
            disabled={layers.some(layer => !layer.tileId)}
            className="w-full"
          >
            Save Wall Configuration
          </Button>
        </div>
      </div>

      <TileCatalog
        isOpen={showTileCatalog}
        onClose={() => setShowTileCatalog(false)}
        onTileSelect={(tileId) => {
          // For layer configuration, we need to know which layer is being configured
          const incompleteLayers = layers.filter(layer => !layer.tileId);
          if (incompleteLayers.length > 0) {
            handleLayerTileChange(incompleteLayers[0].layerNumber, tileId);
          }
          setShowTileCatalog(false);
        }}
        selectedTileIds={layers.map(layer => layer.tileId).filter(Boolean) as string[]}
      />
    </div>
  );
};
