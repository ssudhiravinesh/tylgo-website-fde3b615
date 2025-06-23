
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, MousePointer, QrCode, X } from "lucide-react";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface TileSelectionCardProps {
  rooms: Room[];
  tiles: Tile[];
  tileSelections: { [roomId: string]: string[] };
  onChooseTile: (roomId: string) => void;
  onScanQR: (roomId: string) => void;
  onRemoveTile: (roomId: string, tileId: string) => void;
  onSaveSelections: () => void;
  onGenerateQuotation: () => void;
  isDeleting: boolean;
}

export const TileSelectionCard = ({
  rooms,
  tiles,
  tileSelections,
  onChooseTile,
  onScanQR,
  onRemoveTile,
  onSaveSelections,
  onGenerateQuotation,
  isDeleting
}: TileSelectionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Tile Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {rooms.map(room => (
          <div key={room.id} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-800">{room.name}</h4>
              <Badge variant="outline">
                {(room.length * room.width).toFixed(2)} {room.unit}²
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => onChooseTile(room.id)}
                variant="outline"
                className="flex-1 gap-2"
              >
                <MousePointer className="h-4 w-4" />
                Choose Tile
              </Button>
              <Button
                onClick={() => onScanQR(room.id)}
                variant="outline"
                className="flex-1 gap-2"
              >
                <QrCode className="h-4 w-4" />
                Scan QR
              </Button>
            </div>

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
                      onClick={() => onRemoveTile(room.id, tileId)}
                      className="h-6 w-6 p-0 hover:bg-red-100"
                      disabled={isDeleting}
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="flex gap-2">
          <Button onClick={onSaveSelections} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Save Selections
          </Button>
          <Button 
            onClick={onGenerateQuotation} 
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={Object.keys(tileSelections).length === 0}
          >
            Generate Quotation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
