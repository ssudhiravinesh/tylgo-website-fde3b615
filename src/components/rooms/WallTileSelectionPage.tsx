import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Layers, Copy, Minus, Plus } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { type WallTileSelection, type WallTileLayer } from "@/utils/tileCalculations";

interface WallTileSelectionPageProps {
  room: Room;
  wallSelection: WallTileSelection;
  tiles: Tile[];
  onBack: () => void;
  onUpdateSelection: (selection: WallTileSelection) => void;
}

export const WallTileSelectionPage = ({ 
  room, 
  wallSelection, 
  tiles, 
  onBack, 
  onUpdateSelection 
}: WallTileSelectionPageProps) => {
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [catalogContext, setCatalogContext] = useState<{
    layerNumber?: number;
    isBaseSelection?: boolean;
  } | null>(null);

  const calculateWallLayers = (baseTileId: string) => {
    const baseTile = tiles.find(t => t.id === baseTileId);
    
    if (!room || !baseTile) return;

    const wallHeight = room.wall_height || 0;
    const wallLength = room.wall_length || room.length || 0;
    
    // Convert tile dimensions from mm to the room's unit
    let tileHeightInRoomUnit: number;
    let tileLengthInRoomUnit: number;
    
    if (room.unit === "feet") {
      tileHeightInRoomUnit = (baseTile.size_length || 0) / 304.8; // mm to feet
      tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 304.8;
    } else if (room.unit === "metre") {
      tileHeightInRoomUnit = (baseTile.size_length || 0) / 1000; // mm to metres
      tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 1000;
    } else {
      tileHeightInRoomUnit = baseTile.size_length || 0; // mm
      tileLengthInRoomUnit = baseTile.size_breadth || 0;
    }

    const layerCount = Math.ceil(wallHeight / tileHeightInRoomUnit);
    const tilesPerLayer = Math.ceil(wallLength / tileLengthInRoomUnit);

    const layers: WallTileLayer[] = [];
    for (let i = 1; i <= layerCount; i++) {
      layers.push({
        layerNumber: i,
        tileId: baseTileId,
        tilesNeeded: tilesPerLayer
      });
    }

    const updatedSelection = {
      ...wallSelection,
      baseTileId,
      layers,
      totalLayers: layerCount
    };

    onUpdateSelection(updatedSelection);
  };

  const handleTileSelected = (tileId: string) => {
    if (!catalogContext) return;

    if (catalogContext.isBaseSelection) {
      // Setting base tile for the first time
      calculateWallLayers(tileId);
      toast.success("Base wall tile selected and layers calculated");
    } else if (catalogContext.layerNumber !== undefined) {
      // Changing tile for specific layer
      const updatedLayers = wallSelection.layers.map(layer =>
        layer.layerNumber === catalogContext.layerNumber
          ? { ...layer, tileId }
          : layer
      );
      
      const updatedSelection = {
        ...wallSelection,
        layers: updatedLayers
      };
      
      onUpdateSelection(updatedSelection);
      toast.success(`Tile updated for layer ${catalogContext.layerNumber}`);
    }

    setShowTileCatalog(false);
    setCatalogContext(null);
  };

  const handleChangeLayerTile = (layerNumber: number) => {
    setCatalogContext({ layerNumber });
    setShowTileCatalog(true);
  };

  const handleCopyTileToAllLayers = (tileId: string) => {
    const updatedLayers = wallSelection.layers.map(layer => ({ 
      ...layer, 
      tileId 
    }));
    
    const updatedSelection = {
      ...wallSelection,
      layers: updatedLayers
    };
    
    onUpdateSelection(updatedSelection);
    toast.success("Tile copied to all layers");
  };

  const handleDeleteLayer = (layerNumber: number) => {
    if (wallSelection.layers.length <= 1) {
      toast.error("Cannot delete the last layer");
      return;
    }

    const updatedLayers = wallSelection.layers.filter(layer => 
      layer.layerNumber !== layerNumber
    );
    
    const updatedSelection = {
      ...wallSelection,
      layers: updatedLayers,
      totalLayers: Math.max(1, wallSelection.totalLayers - 1)
    };
    
    onUpdateSelection(updatedSelection);
    toast.success(`Layer ${layerNumber} deleted`);
  };

  const handleAddLayer = () => {
    const maxLayerNumber = Math.max(...wallSelection.layers.map(l => l.layerNumber));
    const newLayer: WallTileLayer = {
      layerNumber: maxLayerNumber + 1,
      tileId: wallSelection.baseTileId || wallSelection.layers[0]?.tileId || '',
      tilesNeeded: wallSelection.layers[0]?.tilesNeeded || 0
    };

    const updatedSelection = {
      ...wallSelection,
      layers: [...wallSelection.layers, newLayer],
      totalLayers: wallSelection.totalLayers + 1
    };

    onUpdateSelection(updatedSelection);
    toast.success("New layer added");
  };

  const handleSelectBaseTile = () => {
    setCatalogContext({ isBaseSelection: true });
    setShowTileCatalog(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-800">Configure Wall Tiles</h2>
          <p className="text-gray-600">{room.name} - Layer Management</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Room Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg">{room.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p>Wall Height: {room.wall_height || 'Not specified'} {room.unit}</p>
                <p>Wall Length: {room.wall_length || room.length || 'Not specified'} {room.unit}</p>
                <p>Wall Area: {((room.wall_height || 0) * (room.wall_length || room.length || 0)).toFixed(2)} sq {room.unit}</p>
              </div>
            </div>

            {!wallSelection.baseTileId ? (
              <Button 
                onClick={handleSelectBaseTile}
                className="w-full"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Select Base Tile
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Layers: {wallSelection.layers.length}</span>
                  <Button 
                    onClick={handleAddLayer}
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Layer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Layer Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-green-600" />
              Layer Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wallSelection.layers.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {wallSelection.layers
                  .sort((a, b) => a.layerNumber - b.layerNumber)
                  .map(layer => {
                    const tile = tiles.find(t => t.id === layer.tileId);
                    return tile ? (
                      <div key={layer.layerNumber} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Layer {layer.layerNumber}
                            </Badge>
                          </div>
                          <p className="font-medium truncate">{tile.name}</p>
                          <p className="text-sm text-gray-500">{tile.code}</p>
                          <p className="text-xs text-gray-400">
                            {layer.tilesNeeded} tiles needed
                          </p>
                        </div>
                        
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleChangeLayerTile(layer.layerNumber)}
                            className="h-8 w-8 p-0"
                            title="Change tile"
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyTileToAllLayers(layer.tileId)}
                            className="h-8 w-8 p-0"
                            title="Copy to all layers"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {wallSelection.layers.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteLayer(layer.layerNumber)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              title="Delete layer"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Layers className="h-12 w-12 mx-auto mb-4" />
                <p>Select a base tile to start configuring layers</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TileCatalog
        isOpen={showTileCatalog}
        onClose={() => {
          setShowTileCatalog(false);
          setCatalogContext(null);
        }}
        onTileSelect={handleTileSelected}
        selectedTileIds={[]}
      />
    </div>
  );
};