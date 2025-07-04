import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Layers, Plus } from "lucide-react";
import { TileAssignmentDialog } from "@/components/tiles/TileAssignmentDialog";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface WallTileSelection {
  [roomId: string]: {
    [layerNumber: number]: string; // tileId for each layer
  };
}

interface WallTileSelectorProps {
  wallRooms: Room[];
  tiles: Tile[];
  wallTileSelections: WallTileSelection;
  wastagePercentage: number;
  onWallTileSelectionChange: (selections: WallTileSelection) => void;
}

export const WallTileSelector = ({
  wallRooms,
  tiles,
  wallTileSelections,
  wastagePercentage,
  onWallTileSelectionChange,
}: WallTileSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedLayer, setSelectedLayer] = useState<number>(1);
  const [roomLayers, setRoomLayers] = useState<{ [roomId: string]: number }>({});

  const getTileById = (tileId: string) => {
    return tiles.find(t => t.id === tileId);
  };

  const calculateWallArea = (room: Room) => {
    if (!room.wall_height || !room.wall_length) return 0;
    return room.wall_height * room.wall_length;
  };

  const generateLayers = (room: Room, sampleTile: Tile) => {
    if (!room.wall_height || !sampleTile.size_length) return 1;
    
    const wallHeightInMm = room.unit === 'metre' ? room.wall_height * 1000 : 
                          room.unit === 'inches' ? room.wall_height * 25.4 :
                          room.unit === 'feet' ? room.wall_height * 304.8 : room.wall_height;
    
    const tileHeightMm = sampleTile.size_length; // Assuming length is height for wall tiles
    const layers = Math.ceil(wallHeightInMm / tileHeightMm);
    
    setRoomLayers(prev => ({ ...prev, [room.id]: layers }));
    return layers;
  };

  const handleChooseTile = (roomId: string, layer: number) => {
    setSelectedRoomId(roomId);
    setSelectedLayer(layer);
    setIsDialogOpen(true);
  };

  const handleTileSelect = (tileId: string) => {
    const room = wallRooms.find(r => r.id === selectedRoomId);
    const tile = getTileById(tileId);
    
    if (room && tile) {
      // If this is the first tile selection for this room, generate layers
      const currentRoomSelections = wallTileSelections[selectedRoomId] || {};
      const isFirstTile = Object.keys(currentRoomSelections).length === 0;
      
      if (isFirstTile) {
        const layers = generateLayers(room, tile);
        // Initialize all layers with empty selections
        const newRoomSelections: { [layerNumber: number]: string } = {};
        for (let i = 1; i <= layers; i++) {
          newRoomSelections[i] = i === selectedLayer ? tileId : "";
        }
        
        onWallTileSelectionChange({
          ...wallTileSelections,
          [selectedRoomId]: newRoomSelections
        });
      } else {
        // Update specific layer
        onWallTileSelectionChange({
          ...wallTileSelections,
          [selectedRoomId]: {
            ...currentRoomSelections,
            [selectedLayer]: tileId
          }
        });
      }
    }
    
    setIsDialogOpen(false);
  };

  const handleRemoveTile = (roomId: string, layer: number) => {
    const currentRoomSelections = wallTileSelections[roomId] || {};
    const updatedRoomSelections = { ...currentRoomSelections };
    delete updatedRoomSelections[layer];
    
    // If no layers left, remove the room entirely and reset layer count
    if (Object.keys(updatedRoomSelections).length === 0) {
      const { [roomId]: removed, ...rest } = wallTileSelections;
      setRoomLayers(prev => {
        const { [roomId]: removedLayers, ...restLayers } = prev;
        return restLayers;
      });
      onWallTileSelectionChange(rest);
    } else {
      onWallTileSelectionChange({
        ...wallTileSelections,
        [roomId]: updatedRoomSelections
      });
    }
  };

  const addLayer = (roomId: string) => {
    const currentLayers = roomLayers[roomId] || 1;
    const newLayerCount = currentLayers + 1;
    
    setRoomLayers(prev => ({ ...prev, [roomId]: newLayerCount }));
    
    // Add empty layer to selections
    const currentRoomSelections = wallTileSelections[roomId] || {};
    onWallTileSelectionChange({
      ...wallTileSelections,
      [roomId]: {
        ...currentRoomSelections,
        [newLayerCount]: ""
      }
    });
  };

  if (wallRooms.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Wall Room Tile Selections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {wallRooms.map((room) => {
            const roomSelections = wallTileSelections[room.id] || {};
            const layerCount = roomLayers[room.id] || Math.max(1, Object.keys(roomSelections).length);
            const wallArea = calculateWallArea(room);

            return (
              <div key={room.id} className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-800">{room.name}</h4>
                    <p className="text-sm text-gray-600">
                      {room.wall_height} × {room.wall_length} {room.unit} (Wall)
                    </p>
                    <p className="text-xs text-gray-500">
                      Area: {wallArea.toFixed(2)} sq {room.unit}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addLayer(room.id)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Layer
                  </Button>
                </div>

                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-700">Layers ({layerCount})</h5>
                  {Array.from({ length: layerCount }, (_, index) => {
                    const layerNumber = index + 1;
                    const selectedTileId = roomSelections[layerNumber];
                    const selectedTile = selectedTileId ? getTileById(selectedTileId) : null;

                    return (
                      <div key={layerNumber} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            Layer {layerNumber}
                          </Badge>
                          {selectedTile ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs font-mono">
                                {selectedTile.code}
                              </Badge>
                              <span className="text-sm font-medium">{selectedTile.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 italic">No tile selected</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChooseTile(room.id, layerNumber)}
                            className="text-xs"
                          >
                            {selectedTile ? 'Change' : 'Choose'} Tile
                          </Button>
                          {selectedTile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTile(room.id, layerNumber)}
                              className="text-red-600 hover:text-red-800 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <TileAssignmentDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customers={[]}
        rooms={[]}
        selectedCustomerId=""
        selectedRooms={[]}
        onCustomerChange={() => {}}
        onRoomToggle={() => {}}
        onSelectAllRooms={() => {}}
        onClearSelections={() => {}}
        onAssignTile={() => {}}
        isAssigning={false}
      />
    </>
  );
};
