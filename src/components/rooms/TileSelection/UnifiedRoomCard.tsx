/**
 * UnifiedRoomCard — renders all rooms with both floor and wall tile sections.
 * 
 * Replaces the separate FloorRoomsCard + WallRoomsCard components.
 * Each room card shows:
 * - Floor section (if has_floor): tile selection, preview
 * - Wall section (if has_wall): configure wall tiles (layers)
 * - Products section
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Trash2, Check, Eye, Layers, Home } from "lucide-react";
import { RoomDimensions } from "../RoomDimensions";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import type { FloorTileSelection, WallTileSelection } from "@/utils/tileCalculations";
import type { RoomProductSelection } from "@/hooks/useProductSelections";

interface UnifiedRoomCardProps {
  rooms: Room[];
  floorTileSelections: FloorTileSelection[];
  wallTileSelections: WallTileSelection[];
  tiles: Tile[];
  selectedFloorRooms: Set<string>;
  productSelections: RoomProductSelection[];
  onToggleRoomSelection: (roomId: string) => void;
  onAddFloorTile: (roomId: string) => void;
  onRemoveFloorTile: (roomId: string, tileId: string) => void;
  onConfigureWallTiles: (roomId: string) => void;
  onClearWallTiles: (roomId: string) => void;
  onAddProduct: (roomId: string) => void;
  onRemoveProduct: (selectionId: string) => void;
  onShowPreview: (room: Room, floorTile: Tile | null, wallLayers: Tile[]) => void;
}

export const UnifiedRoomCard = ({
  rooms,
  floorTileSelections,
  wallTileSelections,
  tiles,
  selectedFloorRooms,
  productSelections,
  onToggleRoomSelection,
  onAddFloorTile,
  onRemoveFloorTile,
  onConfigureWallTiles,
  onClearWallTiles,
  onAddProduct,
  onRemoveProduct,
  onShowPreview,
}: UnifiedRoomCardProps) => {
  const formatTileDim = (l?: number, b?: number) => {
    if (!l || !b) return "";
    return `${l} × ${b} mm`;
  };

  if (rooms.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-primary" />
          Rooms ({rooms.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rooms.map(room => {
          const floorSelections = floorTileSelections.filter(fs => fs.roomId === room.id);
          const wallSelection = wallTileSelections.find(ws => ws.roomId === room.id);
          const isSelected = selectedFloorRooms.has(room.id);

          return (
            <div
              key={room.id}
              className={`border rounded-lg p-4 transition-colors ${isSelected ? 'bg-primary/8 border-primary/30 ring-1 ring-primary/20' : 'bg-muted/30 hover:border-primary/30'}`}
            >
              {/* Room header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Checkbox for bulk floor tile selection */}
                  {room.has_floor && (
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
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-base text-gray-800">{room.name}</h4>
                      <div className="flex gap-1">
                        {room.has_floor && <Badge variant="default" className="text-[10px] h-5">Floor</Badge>}
                        {room.has_wall && <Badge variant="secondary" className="text-[10px] h-5">Wall</Badge>}
                      </div>
                    </div>
                    <RoomDimensions room={room} variant="compact" />
                  </div>
                </div>

                {/* Unified Preview button — shown when any tile (floor or wall) is selected */}
                {(() => {
                  const hasAnyFloorTile = floorSelections.length > 0;
                  const hasAnyWallTile = wallSelection && wallSelection.layers.length > 0;
                  if (!hasAnyFloorTile && !hasAnyWallTile) return null;

                  const floorTile = hasAnyFloorTile
                    ? tiles.find(t => t.id === floorSelections[0].tileId) || null
                    : null;
                  const wallLayerTiles = hasAnyWallTile
                    ? [...wallSelection.layers]
                        .sort((a, b) => a.layerNumber - b.layerNumber)
                        .map(l => tiles.find(t => t.id === l.tileId))
                        .filter((t): t is Tile => !!t)
                    : [];

                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onShowPreview(room, floorTile, wallLayerTiles)}
                      className="gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  );
                })()}
              </div>

              {/* ═══ Floor Tile Section ═══ */}
              {room.has_floor && (
                <div className="mb-4">
                  <div className="flex items-center justify-between pl-9 mb-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Floor Tiles
                    </h5>
                  </div>
                  {floorSelections.length > 0 ? (
                    <div className="space-y-2 pl-9">
                      {floorSelections.map((fs, index) => {
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
                    <div className="pl-9 flex items-center justify-between">
                      <p className="text-sm text-gray-400 italic">No floor tiles selected</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddFloorTile(room.id)}
                        className="gap-1 text-primary border-primary/20 hover:bg-primary/10"
                      >
                        <Plus className="h-3 w-3" />
                        Add Floor Tile
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Wall Tile Section ═══ */}
              {room.has_wall && (
                <div className="mb-4">
                  <div className="flex items-center justify-between pl-9 mb-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Wall Tiles
                    </h5>
                    {wallSelection && wallSelection.layers.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          onClick={() => onConfigureWallTiles(room.id)}
                          className="gap-1"
                        >
                          <Layers className="h-3 w-3" />
                          Configure
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onClearWallTiles(room.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                          title="Clear all wall tiles"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConfigureWallTiles(room.id)}
                        className="gap-1 text-primary border-primary/20 hover:bg-primary/10"
                      >
                        <Plus className="h-3 w-3" />
                        Add Wall Tile
                      </Button>
                    )}
                  </div>

                  {wallSelection && wallSelection.layers.length > 0 ? (
                    <div className="pl-9 space-y-2">
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
                            <div className="pt-2 border-t border-border/50 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Selected Tiles:</p>
                              {uniqueTiles.map(tile => (tile &&
                                <div key={tile.id} className="bg-card p-2 rounded border border-border flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{tile.code}</span>
                                    <span className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                      {formatTileDim(tile.size_length, tile.size_breadth)}
                                    </span>
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
                    <p className="text-sm text-gray-400 italic pl-9">No wall tiles configured</p>
                  )}
                </div>
              )}

              {/* ═══ Products Section ═══ */}
              <div className="pt-3 border-t border-gray-100 pl-9">
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
