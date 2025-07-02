
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, Ruler, Calculator, Plus, Trash2, Package } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface WallTileConfigurationStepProps {
  customerId: string;
  rooms: Room[];
  onBack: () => void;
}

interface WallDimensions {
  height: number;
  length: number;
}

interface LayerConfiguration {
  layerNumber: number;
  selectedTileIds: string[];
  tilesPerLayer: number;
}

interface WallConfiguration {
  roomId: string;
  dimensions: WallDimensions;
  selectedTileType: Tile | null;
  totalLayers: number;
  layerConfigurations: LayerConfiguration[];
}

export const WallTileConfigurationStep = ({ customerId, rooms, onBack }: WallTileConfigurationStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [wallDimensions, setWallDimensions] = useState<WallDimensions>({ height: 0, length: 0 });
  const [selectedTileType, setSelectedTileType] = useState<Tile | null>(null);
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [isSelectingTileType, setIsSelectingTileType] = useState(false);
  const [currentStep, setCurrentStep] = useState<'room-selection' | 'dimensions' | 'tile-type' | 'layer-configuration'>('room-selection');
  
  const [wallConfiguration, setWallConfiguration] = useState<WallConfiguration | null>(null);
  const [currentLayerForTileSelection, setCurrentLayerForTileSelection] = useState<number | null>(null);
  const [wastagePercentage, setWastagePercentage] = useState<number>(10);

  const calculateLayers = (height: number, tileHeight: number) => {
    if (height <= 0 || tileHeight <= 0) return 0;
    return Math.ceil(height / (tileHeight / 304.8)); // Convert mm to feet
  };

  const calculateTilesPerLayer = (length: number, tileWidth: number) => {
    if (length <= 0 || tileWidth <= 0) return 0;
    return Math.ceil(length / (tileWidth / 304.8)); // Convert mm to feet
  };

  const handleRoomSelection = (roomId: string) => {
    setSelectedRoomId(roomId);
    setCurrentStep('dimensions');
  };

  const handleDimensionsSubmit = () => {
    if (wallDimensions.height <= 0 || wallDimensions.length <= 0) {
      toast.error("Please enter valid dimensions");
      return;
    }
    setCurrentStep('tile-type');
  };

  const handleTileTypeSelection = () => {
    setIsSelectingTileType(true);
    setShowTileCatalog(true);
  };

  const handleTileTypeSelected = (tileId: string) => {
    const tile = tiles.find(t => t.id === tileId);
    if (!tile) return;

    setSelectedTileType(tile);
    setShowTileCatalog(false);
    setIsSelectingTileType(false);

    // Calculate layers and tiles per layer
    const totalLayers = calculateLayers(wallDimensions.height, tile.size_length || 0);
    const tilesPerLayer = calculateTilesPerLayer(wallDimensions.length, tile.size_breadth || 0);

    // Initialize layer configurations
    const layerConfigurations: LayerConfiguration[] = [];
    for (let i = 1; i <= totalLayers; i++) {
      layerConfigurations.push({
        layerNumber: i,
        selectedTileIds: [],
        tilesPerLayer
      });
    }

    const newWallConfiguration: WallConfiguration = {
      roomId: selectedRoomId,
      dimensions: wallDimensions,
      selectedTileType: tile,
      totalLayers,
      layerConfigurations
    };

    setWallConfiguration(newWallConfiguration);
    setCurrentStep('layer-configuration');
  };

  const handleLayerTileSelection = (layerNumber: number) => {
    setCurrentLayerForTileSelection(layerNumber);
    setShowTileCatalog(true);
  };

  const handleLayerTileSelected = (tileId: string) => {
    if (!wallConfiguration || currentLayerForTileSelection === null) return;

    const updatedConfigurations = wallConfiguration.layerConfigurations.map(config => {
      if (config.layerNumber === currentLayerForTileSelection) {
        return {
          ...config,
          selectedTileIds: [...config.selectedTileIds, tileId]
        };
      }
      return config;
    });

    setWallConfiguration({
      ...wallConfiguration,
      layerConfigurations: updatedConfigurations
    });

    setShowTileCatalog(false);
    setCurrentLayerForTileSelection(null);
  };

  const removeTileFromLayer = (layerNumber: number, tileId: string) => {
    if (!wallConfiguration) return;

    const updatedConfigurations = wallConfiguration.layerConfigurations.map(config => {
      if (config.layerNumber === layerNumber) {
        return {
          ...config,
          selectedTileIds: config.selectedTileIds.filter(id => id !== tileId)
        };
      }
      return config;
    });

    setWallConfiguration({
      ...wallConfiguration,
      layerConfigurations: updatedConfigurations
    });
  };

  const calculateTotalPrice = () => {
    if (!wallConfiguration) return 0;

    let totalPrice = 0;
    
    wallConfiguration.layerConfigurations.forEach(layerConfig => {
      layerConfig.selectedTileIds.forEach(tileId => {
        const tile = tiles.find(t => t.id === tileId);
        if (tile && tile.price_per_box && tile.pieces_per_box) {
          const tilesNeeded = Math.ceil(layerConfig.tilesPerLayer * (1 + (wastagePercentage / 100)));
          const boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
          totalPrice += boxesNeeded * tile.price_per_box;
        }
      });
    });

    return totalPrice;
  };

  const handleSaveConfiguration = () => {
    if (!wallConfiguration) return;
    
    // Here you would save the wall configuration to your backend
    toast.success("Wall tile configuration saved successfully!");
    onBack();
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const totalPrice = calculateTotalPrice();

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
          <h2 className="text-2xl font-bold text-gray-800">Configure Wall Tiles</h2>
          <p className="text-gray-600">Set up wall tile configurations for your rooms</p>
        </div>
      </div>

      {/* Step 1: Room Selection */}
      {currentStep === 'room-selection' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Select Room for Wall Tiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map(room => (
                <Button
                  key={room.id}
                  variant="outline"
                  onClick={() => handleRoomSelection(room.id)}
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">{room.name}</div>
                    <div className="text-sm text-gray-500">
                      Floor: {room.length} × {room.width} {room.unit}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Wall Dimensions */}
      {currentStep === 'dimensions' && selectedRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Wall Dimensions for {selectedRoom.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="wall-height">Wall Height (feet)</Label>
                <Input
                  id="wall-height"
                  type="number"
                  value={wallDimensions.height || ''}
                  onChange={(e) => setWallDimensions(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter wall height"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <Label htmlFor="wall-length">Wall Length (feet)</Label>
                <Input
                  id="wall-length"
                  type="number"
                  value={wallDimensions.length || ''}
                  onChange={(e) => setWallDimensions(prev => ({ ...prev, length: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter wall length"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            <Button onClick={handleDimensionsSubmit} className="w-full">
              Next: Select Tile Type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Tile Type Selection */}
      {currentStep === 'tile-type' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Wall Tile Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTileType ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium">{selectedTileType.name}</h4>
                  <p className="text-sm text-gray-600">Code: {selectedTileType.code}</p>
                  <p className="text-sm text-gray-600">
                    Size: {((selectedTileType.size_length || 0) / 304.8).toFixed(2)} × {((selectedTileType.size_breadth || 0) / 304.8).toFixed(2)} ft
                  </p>
                </div>
                <Button onClick={() => handleTileTypeSelected(selectedTileType.id)} className="w-full">
                  Continue with this tile type
                </Button>
              </div>
            ) : (
              <Button onClick={handleTileTypeSelection} className="w-full">
                Choose Tile Type from Catalog
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Layer Configuration */}
      {currentStep === 'layer-configuration' && wallConfiguration && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Layer Configuration
              </CardTitle>
              <div className="text-sm text-gray-600">
                Wall: {wallDimensions.height} × {wallDimensions.length} ft | 
                Layers: {wallConfiguration.totalLayers} | 
                Tiles per layer: {wallConfiguration.layerConfigurations[0]?.tilesPerLayer || 0}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Wastage Percentage */}
              <div>
                <Label htmlFor="wall-wastage">Wastage Percentage (%) - Max 15%</Label>
                <Input
                  id="wall-wastage"
                  type="number"
                  value={wastagePercentage}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0 && value <= 15) {
                      setWastagePercentage(value);
                    }
                  }}
                  min="0"
                  max="15"
                  className="w-full"
                />
              </div>

              {/* Layer Configuration */}
              <div className="grid gap-4">
                {wallConfiguration.layerConfigurations.map(layerConfig => (
                  <div key={layerConfig.layerNumber} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Layer {layerConfig.layerNumber}</h4>
                      <Button
                        size="sm"
                        onClick={() => handleLayerTileSelection(layerConfig.layerNumber)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Tiles
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {layerConfig.selectedTileIds.map(tileId => {
                        const tile = tiles.find(t => t.id === tileId);
                        return tile ? (
                          <Badge
                            key={tileId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tile.name}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 hover:bg-red-100"
                              onClick={() => removeTileFromLayer(layerConfig.layerNumber, tileId)}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </Badge>
                        ) : null;
                      })}
                      {layerConfig.selectedTileIds.length === 0 && (
                        <span className="text-sm text-gray-500">No tiles selected</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Price Display */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Wall Tiles Cost:</span>
                  <span className="text-lg font-bold text-green-600">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Includes {wastagePercentage}% wastage allowance
                </p>
              </div>

              <Button onClick={handleSaveConfiguration} className="w-full">
                Save Wall Tile Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <TileCatalog
        isOpen={showTileCatalog}
        onClose={() => {
          setShowTileCatalog(false);
          setCurrentLayerForTileSelection(null);
          setIsSelectingTileType(false);
        }}
        onTileSelect={isSelectingTileType ? handleTileTypeSelected : handleLayerTileSelected}
        selectedTileIds={[]}
      />
    </div>
  );
};
