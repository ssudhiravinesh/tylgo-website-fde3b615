/**
 * Wall rooms card — renders wall rooms with their layer-based tile configurations.
 * Extracted from TileSelectionStep.tsx (lines 1057-1139).
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { RoomDimensions } from "../RoomDimensions";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import type { WallTileSelection } from "@/utils/tileCalculations";

interface WallRoomsCardProps {
  wallRooms: Room[];
  wallTileSelections: WallTileSelection[];
  tiles: Tile[];
  onConfigureWallTiles: (roomId: string) => void;
}

export const WallRoomsCard = ({
  wallRooms,
  wallTileSelections,
  tiles,
  onConfigureWallTiles,
}: WallRoomsCardProps) => {
  const formatTileDim = (l?: number, b?: number) => {
    if (!l || !b) return "";
    return `${l} × ${b} mm`;
  };

  if (wallRooms.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Wall Rooms ({wallRooms.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {wallRooms.map(room => {
          const wallSelection = wallTileSelections.find(ws => ws.roomId === room.id);
          return (
            <div key={room.id} className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-base">{room.name}</h4>
                  <RoomDimensions room={room} variant="compact" />
                </div>
                <Button
                  onClick={() => onConfigureWallTiles(room.id)}
                  className="gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Configure
                </Button>
              </div>

              {wallSelection && wallSelection.layers.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500">Layers:</span>
                      <span className="font-semibold ml-2">{wallSelection.layers.length}</span>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500">Total Tiles:</span>
                      <span className="font-semibold ml-2">
                        {wallSelection.layers.reduce((sum, layer) => sum + layer.tilesNeeded, 0).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* List unique tiles */}
                  {(() => {
                    const uniqueTileIds = Array.from(new Set(wallSelection.layers.map(l => l.tileId)));
                    const uniqueTiles = uniqueTileIds.map(id => tiles.find(t => t.id === id)).filter(Boolean);

                    if (uniqueTiles.length > 0) {
                      return (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                          <p className="text-xs font-medium text-foreground mb-2">Selected Tiles:</p>
                          {uniqueTiles.map(tile => (tile &&
                            <div key={tile.id} className="bg-card p-2 rounded border border-border flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{tile.code}</span>
                                  <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                    {formatTileDim(tile.size_length, tile.size_breadth)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">{tile.code}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No wall tiles configured</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
