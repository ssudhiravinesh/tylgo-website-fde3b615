
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Copy, Trash2 } from "lucide-react";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface LayerConfiguration {
  layerNumber: number;
  tileId: string | null;
  tilesNeeded: number;
}

interface WallTileSelectorProps {
  room: Room;
  tiles: Tile[];
  selectedTiles: { [key: string]: string }; // key: `${layerNumber}`, value: tileId
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
  wastagePercentage,
}: WallTileSelectorProps) => {
  const [layers, setLayers] = useState<LayerConfiguration[]>([]);
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [selectedLayerForTile, setSelectedLayerForTile] = useState<number | null>(null);

  // Calculate layers based on room dimensions and a base tile size
  useEffect(() => {
    if (!room.wall_height || !room.wall_length) return;

    // Use a standard tile height for layer calculation (assuming 300mm tiles)
    const standardTileHeightM = 0.3; // 300mm in metres
    
    // Convert room dimensions to metres if needed
    let wallHeightM = room.wall_height;
    let wallLengthM = room.wall_length;
    
    if (room.unit === 'feet') {
      wallHeightM = room.wall_height * 0.3048;
      wallLengthM = room.wall_length * 0.3048;
    } else if (room.unit === 'inches') {
      wallHeightM = room.wall_height * 0.0254;
      wallLengthM = room.wall_length * 0.0254;
    } else if (room.unit === 'mm') {
      wallHeightM = room.wall_height / 1000;
      wallLengthM = room.wall_length / 1000;
    }

    const layerCount = Math.ceil(wallHeightM / standardTileHeightM);
    const tilesPerLayer = Math.ceil(wallLengthM / 0.3); // Assuming 300mm tile width
    
    const newLayers: LayerConfiguration[] = [];
    for (let i = 1; i <= layerCount; i++) {
      newLayers.push({
        layerNumber: i,
        tileId: selectedTiles[i.toString()] || null,
        tilesNeeded: tilesPerLayer
      });
    }
    
    setLayers(newLayers);
  }, [room, selectedTiles]);

  const handleChooseTileForLayer = (layerNumber: number) => {
    setSelectedLayerForTile(layerNumber);
    setShowTileCatalog(true);
  };

  const handleTileSelected = (tileId: string) => {
    if (selectedLayerForTile !== null) {
      onTileSelect(selectedLayerForTile, tileId);
      const tile = tiles.find(t => t.id === tileId);
      if (tile) {
        toast.success(`Tile "${tile.name}" added to layer ${selectedLayerForTile}`);
      }
    }
    setShowTileCatalog(false);
    setSelectedLayerForTile(null);
  };

  const copyTileToAllLayers = (tileId: string) => {
    layers.forEach(layer => {
      onTileSelect(layer.layerNumber, tileId);
    });
    toast.success("Tile copied to all layers");
  };

  const getTileById = (tileId: string) => tiles.find(t => t.id === tileId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Wall Layers ({layers.length} layers)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {layers.map((layer) => {
          const selectedTile = layer.tileId ? getTileById(layer.tileId) : null;
          
          return (
            <div key={layer.layerNumber} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Layer {layer.layerNumber}</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleChooseTileForLayer(layer.layerNumber)}
                    className="text-xs"
                  >
                    Choose Tile
                  </Button>
                  {selectedTile && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyTileToAllLayers(selectedTile.id)}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onTileRemove(layer.layerNumber, selectedTile.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {selectedTile ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-mono">
                      {selectedTile.code}
                    </Badge>
                    <span className="text-sm font-medium">{selectedTile.name}</span>
                  </div>
                  <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                    <div>
                      <p>Tiles needed: {layer.tilesNeeded}</p>
                      {selectedTile.pieces_per_box && (
                        <p>Boxes: {Math.ceil(layer.tilesNeeded * (1 + wastagePercentage / 100) / selectedTile.pieces_per_box)}</p>
                      )}
                    </div>
                    {selectedTile.price_per_box && selectedTile.pieces_per_box && (
                      <div>
                        <p>Price: ₹{(Math.ceil(layer.tilesNeeded * (1 + wastagePercentage / 100) / selectedTile.pieces_per_box) * selectedTile.price_per_box).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No tile selected</p>
              )}
            </div>
          );
        })}

        <TileCatalog
          isOpen={showTileCatalog}
          onClose={() => {
            setShowTileCatalog(false);
            setSelectedLayerForTile(null);
          }}
          onTileSelect={handleTileSelected}
          selectedTileIds={Object.values(selectedTiles)}
        />
      </CardContent>
    </Card>
  );
};
