
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Layers, Calculator } from "lucide-react";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { toast } from "sonner";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface WallTileSelectorProps {
  room: Room;
  tiles: Tile[];
  selectedTiles: { [layerNumber: string]: string };
  onTileSelect: (layerNumber: number, tileId: string) => void;
  onTileRemove: (layerNumber: number, tileId: string) => void;
  wastagePercentage: number;
}

export const WallTileSelector = ({
  room,
  tiles,
  selectedTiles,
  onTileSelect,
  onTileRemove,
  wastagePercentage
}: WallTileSelectorProps) => {
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [selectedLayerForTile, setSelectedLayerForTile] = useState<number | null>(null);
  const [layers, setLayers] = useState<number[]>([]);
  const [sampleTileId, setSampleTileId] = useState<string | null>(null);

  const getTileById = (tileId: string) => {
    return tiles.find(t => t.id === tileId);
  };

  // Generate layers based on sample tile dimensions
  useEffect(() => {
    if (sampleTileId && room.wall_height) {
      const sampleTile = getTileById(sampleTileId);
      if (sampleTile && sampleTile.size_length) {
        // Convert tile height from mm to the room's unit
        let tileHeightInRoomUnit = sampleTile.size_length / 1000; // Convert mm to meters
        
        // Convert to room's unit if needed
        if (room.unit === "feet") {
          tileHeightInRoomUnit = tileHeightInRoomUnit * 3.28084; // meters to feet
        } else if (room.unit === "inches") {
          tileHeightInRoomUnit = tileHeightInRoomUnit * 39.3701; // meters to inches
        } else if (room.unit === "mm") {
          tileHeightInRoomUnit = sampleTile.size_length; // already in mm
        }
        
        const numberOfLayers = Math.ceil(room.wall_height / tileHeightInRoomUnit);
        setLayers(Array.from({ length: numberOfLayers }, (_, i) => i + 1));
      }
    } else {
      setLayers([]);
    }
  }, [sampleTileId, room.wall_height, room.unit]);

  const handleChooseSampleTile = () => {
    setSelectedLayerForTile(0); // Special value for sample tile
    setShowTileCatalog(true);
  };

  const handleChooseTileForLayer = (layerNumber: number) => {
    setSelectedLayerForTile(layerNumber);
    setShowTileCatalog(true);
  };

  const handleTileSelected = (tileId: string) => {
    if (selectedLayerForTile === 0) {
      // Sample tile selected
      setSampleTileId(tileId);
      const tile = getTileById(tileId);
      if (tile) {
        toast.success(`Sample tile "${tile.name}" selected. Layers generated.`);
      }
    } else if (selectedLayerForTile !== null) {
      // Layer tile selected
      const existingTileId = selectedTiles[selectedLayerForTile.toString()];
      if (existingTileId === tileId) {
        toast.error("This tile is already selected for this layer");
        setShowTileCatalog(false);
        setSelectedLayerForTile(null);
        return;
      }

      onTileSelect(selectedLayerForTile, tileId);
      const tile = getTileById(tileId);
      if (tile) {
        toast.success(`Tile "${tile.name}" added to layer ${selectedLayerForTile}`);
      }
    }
    
    setShowTileCatalog(false);
    setSelectedLayerForTile(null);
  };

  const handleCloseTileCatalog = () => {
    setShowTileCatalog(false);
    setSelectedLayerForTile(null);
  };

  const calculateTileRequirements = (tile: Tile, layerNumber: number) => {
    if (!room.wall_height || !room.wall_length || !tile.size_length || !tile.size_breadth) {
      return { tilesNeeded: 0, boxesNeeded: 0, totalPrice: 0, layerArea: 0 };
    }

    // Calculate layer height
    let tileHeightInRoomUnit = tile.size_length / 1000; // Convert mm to meters
    
    // Convert to room's unit if needed
    if (room.unit === "feet") {
      tileHeightInRoomUnit = tileHeightInRoomUnit * 3.28084;
    } else if (room.unit === "inches") {
      tileHeightInRoomUnit = tileHeightInRoomUnit * 39.3701;
    } else if (room.unit === "mm") {
      tileHeightInRoomUnit = tile.size_length;
    }

    const layerHeight = Math.min(tileHeightInRoomUnit, room.wall_height - (layerNumber - 1) * tileHeightInRoomUnit);
    const layerArea = calculateAreaInSquareFeet(layerHeight, room.wall_length, room.unit);

    // Calculate tile area in square feet
    const tileLengthFt = (tile.size_length || 0) / 304.8;
    const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
    const tileAreaSqFt = tileLengthFt * tileBreadthFt;

    if (tileAreaSqFt > 0) {
      const basicTilesNeeded = Math.ceil(layerArea / tileAreaSqFt);
      const tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
      const boxesNeeded = Math.ceil(tilesNeeded / (tile.pieces_per_box || 1));
      const totalPrice = boxesNeeded * (tile.price_per_box || 0);

      return { tilesNeeded, boxesNeeded, totalPrice, layerArea };
    }

    return { tilesNeeded: 0, boxesNeeded: 0, totalPrice: 0, layerArea };
  };

  const sampleTile = sampleTileId ? getTileById(sampleTileId) : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Wall Room: {room.name}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {room.wall_height} × {room.wall_length} {room.unit} (Wall)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sample Tile Selection */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-blue-800">Sample Tile (for layer calculation)</h4>
                <p className="text-sm text-blue-600">Choose a tile to generate wall layers</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleChooseSampleTile}
                className="text-xs"
              >
                Choose Sample Tile
              </Button>
            </div>

            {sampleTile && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs font-mono">
                  {sampleTile.code}
                </Badge>
                <span className="text-sm font-medium">{sampleTile.name}</span>
                <span className="text-xs text-gray-600">
                  ({layers.length} layers generated)
                </span>
              </div>
            )}
          </div>

          {/* Layer Selection */}
          {layers.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Select tiles for each layer:</h4>
              {layers.map((layerNumber) => {
                const selectedTileId = selectedTiles[layerNumber.toString()];
                const selectedTile = selectedTileId ? getTileById(selectedTileId) : null;
                const calculations = selectedTile ? calculateTileRequirements(selectedTile, layerNumber) : null;

                return (
                  <div key={layerNumber} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-gray-800">Layer {layerNumber}</h5>
                        {calculations && (
                          <p className="text-xs text-gray-600">
                            Area: {calculations.layerArea.toFixed(2)} sq ft
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChooseTileForLayer(layerNumber)}
                        className="text-xs"
                      >
                        Choose Tile
                      </Button>
                    </div>

                    {selectedTile && calculations && (
                      <div className="flex items-center justify-between bg-white p-2 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-mono">
                              {selectedTile.code}
                            </Badge>
                            <span className="text-sm font-medium">{selectedTile.name}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1 flex gap-4">
                            <span>Tiles: {calculations.tilesNeeded}</span>
                            <span>Boxes: {calculations.boxesNeeded}</span>
                            <span>₹{calculations.totalPrice.toLocaleString()}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTileRemove(layerNumber, selectedTileId)}
                          className="text-red-600 hover:text-red-800 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {!selectedTile && (
                      <p className="text-sm text-gray-500 italic">No tile selected for this layer</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {layers.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              Select a sample tile to generate wall layers
            </p>
          )}
        </CardContent>
      </Card>

      <TileCatalog
        isOpen={showTileCatalog}
        onClose={handleCloseTileCatalog}
        onTileSelect={handleTileSelected}
        selectedTileIds={[]}
      />
    </>
  );
};
