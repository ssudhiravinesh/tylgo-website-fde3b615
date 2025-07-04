import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface TileSelectionCardProps {
  rooms: Room[];
  tiles: Tile[];
  tileSelections: { [roomId: string]: string[] };
  wastagePercentage: number;
  onChooseTile: (roomId: string) => void;
  onRemoveTile: (roomId: string, tileId: string) => void;
  isDeleting: boolean;
}

export const TileSelectionCard = ({
  rooms,
  tiles,
  tileSelections,
  wastagePercentage,
  onChooseTile,
  onRemoveTile,
  isDeleting,
}: TileSelectionCardProps) => {
  const getTileById = (tileId: string) => {
    return tiles.find(t => t.id === tileId);
  };

  const calculatePricePerSqFt = (tile: Tile) => {
    if (!tile.price_per_box || !tile.pieces_per_box || !tile.size_length || !tile.size_breadth) {
      return 0;
    }
    
    const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
    const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764; // Convert to sq ft
    return tile.price_per_box / areaPerBoxSqFt;
  };

  const floorRooms = rooms.filter(room => room.room_type === 'floor');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Floor Room Tile Selections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {floorRooms.map((room) => (
          <div key={room.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-800">{room.name}</h4>
                <p className="text-sm text-gray-600">
                  {room.length} × {room.width} {room.unit} (Floor)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChooseTile(room.id)}
                  className="text-xs"
                >
                  Choose Tile
                </Button>
              </div>
            </div>

            {/* Selected Tiles */}
            <div className="space-y-2">
              {(tileSelections[room.id] || []).map((tileId) => {
                const tile = getTileById(tileId);
                if (!tile) return null;

                const pricePerSqFt = calculatePricePerSqFt(tile);

                return (
                  <div key={tileId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {tile.code}
                        </Badge>
                        <span className="text-sm font-medium">{tile.name}</span>
                      </div>
                      {pricePerSqFt > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          ₹{pricePerSqFt.toFixed(2)} per sq ft
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveTile(room.id, tileId)}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-800 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              
              {(!tileSelections[room.id] || tileSelections[room.id].length === 0) && (
                <p className="text-sm text-gray-500 italic">No tiles selected</p>
              )}
            </div>
          </div>
        ))}

        {floorRooms.length === 0 && (
          <p className="text-sm text-gray-500 italic text-center py-4">No floor rooms available</p>
        )}
      </CardContent>
    </Card>
  );
};
