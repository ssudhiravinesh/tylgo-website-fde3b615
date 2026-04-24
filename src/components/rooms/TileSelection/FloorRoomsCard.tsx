/**
 * Floor rooms card — renders the list of floor rooms with their tile selections.
 * Extracted from TileSelectionStep.tsx (lines 917-1054).
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Plus, Trash2, Check, Eye } from "lucide-react";
import { RoomDimensions } from "../RoomDimensions";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import type { FloorTileSelection } from "@/utils/tileCalculations";
import type { RoomProductSelection } from "@/hooks/useProductSelections";

interface FloorRoomsCardProps {
  floorRooms: Room[];
  floorTileSelections: FloorTileSelection[];
  tiles: Tile[];
  selectedFloorRooms: Set<string>;
  productSelections: RoomProductSelection[];
  onToggleRoomSelection: (roomId: string) => void;
  onAddFloorTile: (roomId: string) => void;
  onRemoveFloorTile: (roomId: string, tileId: string) => void;
  onAddProduct: (roomId: string) => void;
  onRemoveProduct: (selectionId: string) => void;
  onShowFloorPreview: (room: Room, tile: Tile | null) => void;
}

export const FloorRoomsCard = ({
  floorRooms,
  floorTileSelections,
  tiles,
  selectedFloorRooms,
  productSelections,
  onToggleRoomSelection,
  onAddFloorTile,
  onRemoveFloorTile,
  onAddProduct,
  onRemoveProduct,
  onShowFloorPreview,
}: FloorRoomsCardProps) => {
  const formatTileDim = (l?: number, b?: number) => {
    if (!l || !b) return "";
    return `${l} × ${b} mm`;
  };

  if (floorRooms.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-primary" />
          Floor Rooms ({floorRooms.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {floorRooms.map(room => {
          const roomSelections = floorTileSelections.filter(fs => fs.roomId === room.id);
          const isSelected = selectedFloorRooms.has(room.id);

          return (
            <div
              key={room.id}
              className={`border rounded-lg p-4 transition-colors ${isSelected ? 'bg-primary/8 border-primary/30 ring-1 ring-primary/20' : 'bg-muted/30 hover:border-primary/30'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => onToggleRoomSelection(room.id)}
                    className={`h-6 w-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all shadow-sm ${isSelected
                      ? "bg-primary border-primary"
                      : "border-border bg-card hover:border-primary/40"
                      }`}
                    title={isSelected ? "Deselect Room" : "Select Room to Add Tile"}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                  </div>

                  <div>
                    <h4 className="font-semibold text-base text-gray-800">{room.name}</h4>
                    <RoomDimensions room={room} variant="compact" />
                  </div>
                </div>

                {roomSelections.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowFloorPreview(room, tiles.find(t => t.id === roomSelections[0].tileId) || null)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                )}
              </div>

              {roomSelections.length > 0 ? (
                <div className="space-y-3 pl-9">
                  {roomSelections.map((fs, index) => {
                    const tile = tiles.find(t => t.id === fs.tileId);
                    return tile ? (
                      <div key={`${fs.roomId}-${fs.tileId}-${index}`} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{tile.code}</p>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {formatTileDim(tile.size_length, tile.size_breadth)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{tile.code}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveFloorTile(room.id, fs.tileId)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic pl-9">No tiles selected</p>
              )}

              {/* Product selection section */}
              <div className="mt-4 pt-4 border-t border-gray-100 pl-9">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</h5>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAddProduct(room.id)}
                    className="h-6 text-xs gap-1 hover:bg-primary/10 text-primary"
                  >
                    <Plus className="h-3 w-3" />
                    Add Product
                  </Button>
                </div>

                {productSelections
                  .filter(ps => ps.room_id === room.id)
                  .map(ps => (
                    <div key={ps.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100 mb-2 last:mb-0">
                      <div className="flex items-center gap-3">
                        {ps.product?.image_url ? (
                          <img src={ps.product.image_url} alt={ps.product.name} className="h-8 w-8 object-cover rounded" />
                        ) : (
                          <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-700">{ps.product?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{ps.product?.code}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemoveProduct(ps.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                {productSelections.filter(ps => ps.room_id === room.id).length === 0 && (
                  <p className="text-xs text-gray-400 italic">No products added</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
