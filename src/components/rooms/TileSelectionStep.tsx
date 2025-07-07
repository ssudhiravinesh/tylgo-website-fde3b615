import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Percent, Plus, Trash2, Calculator, Package, IndianRupee, Layers, Copy, Minus } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { toast } from "sonner";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import { 
  calculateTileRequirements, 
  calculateGrandTotal, 
  prepareQuotationItems,
  type FloorTileSelection,
  type WallTileSelection,
  type WallTileLayer 
} from "@/utils/tileCalculations";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface TileSelectionStepProps {
  customerId: string;
  rooms: Room[];
  onBack: () => void;
}


export const TileSelectionStep = ({ customerId, rooms, onBack }: TileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  
  const [floorTileSelections, setFloorTileSelections] = useState<FloorTileSelection[]>([]);
  const [wallTileSelections, setWallTileSelections] = useState<WallTileSelection[]>([]);
  const [wastagePercentage, setWastagePercentage] = useState<string>("10");
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [catalogContext, setCatalogContext] = useState<{
    roomId: string;
    isWallTile: boolean;
    layerNumber?: number;
  } | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);

  const floorRooms = rooms.filter(room => room.room_type === "floor");
  const wallRooms = rooms.filter(room => room.room_type === "wall");

  useEffect(() => {
    // Initialize selections from database
    const floorSelections: FloorTileSelection[] = [];
    const wallSelections: WallTileSelection[] = [];

    selections.forEach(selection => {
      const room = rooms.find(r => r.id === selection.room_id);
      if (!room) return;

      if (room.room_type === "floor") {
        floorSelections.push({
          roomId: selection.room_id,
          tileId: selection.tile_id
        });
      } else {
        // For wall tiles, group by room and layer
        let wallSelection = wallSelections.find(ws => ws.roomId === selection.room_id);
        if (!wallSelection) {
          wallSelection = {
            roomId: selection.room_id,
            baseTileId: null,
            layers: [],
            totalLayers: 0
          };
          wallSelections.push(wallSelection);
        }
        
        const layerNumber = selection.layer_number || 1;
        const existingLayer = wallSelection.layers.find(l => l.layerNumber === layerNumber);
        if (!existingLayer) {
          wallSelection.layers.push({
            layerNumber,
            tileId: selection.tile_id,
            tilesNeeded: 0 // Will be calculated
          });
        }
      }
    });

    setFloorTileSelections(floorSelections);
    setWallTileSelections(wallSelections);
  }, [selections, rooms]);

  const handleAddFloorTile = (roomId: string) => {
    setCatalogContext({ roomId, isWallTile: false });
    setShowTileCatalog(true);
  };

  const handleConfigureWallTiles = (roomId: string) => {
    const room = wallRooms.find(r => r.id === roomId);
    if (!room) return;

    // Check if wall selection already exists
    let wallSelection = wallTileSelections.find(ws => ws.roomId === roomId);
    if (!wallSelection) {
      // Create new wall selection
      wallSelection = {
        roomId,
        baseTileId: null,
        layers: [],
        totalLayers: 0
      };
      setWallTileSelections(prev => [...prev, wallSelection!]);
    }

    // Open catalog to select base tile
    setCatalogContext({ roomId, isWallTile: true });
    setShowTileCatalog(true);
  };

  const calculateWallLayers = (roomId: string, baseTileId: string) => {
    const room = wallRooms.find(r => r.id === roomId);
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

    setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId
          ? { ...ws, baseTileId, layers, totalLayers: layerCount }
          : ws
      )
    );
  };

  const handleTileSelected = (tileId: string) => {
    if (!catalogContext) return;

    const { roomId, isWallTile, layerNumber } = catalogContext;

    if (!isWallTile) {
      // Floor tile selection
      const existingSelection = floorTileSelections.find(
        fs => fs.roomId === roomId && fs.tileId === tileId
      );
      
      if (existingSelection) {
        toast.error("This tile is already selected for this room");
      } else {
        setFloorTileSelections(prev => [...prev, { roomId, tileId }]);
        toast.success("Floor tile added to room");
      }
    } else {
      // Wall tile selection
      const wallSelection = wallTileSelections.find(ws => ws.roomId === roomId);
      
      if (!wallSelection || !wallSelection.baseTileId) {
        // Setting base tile for the first time
        calculateWallLayers(roomId, tileId);
        toast.success("Base wall tile selected and layers calculated");
      } else if (layerNumber !== undefined) {
        // Changing tile for specific layer
        setWallTileSelections(prev =>
          prev.map(ws =>
            ws.roomId === roomId
              ? {
                  ...ws,
                  layers: ws.layers.map(layer =>
                    layer.layerNumber === layerNumber
                      ? { ...layer, tileId }
                      : layer
                  )
                }
              : ws
          )
        );
        toast.success(`Tile updated for layer ${layerNumber}`);
      }
    }

    setShowTileCatalog(false);
    setCatalogContext(null);
  };

  const handleRemoveFloorTile = async (roomId: string, tileId: string) => {
    try {
      await deleteSelectionMutation.mutateAsync({ roomId, tileId });
      setFloorTileSelections(prev =>
        prev.filter(fs => !(fs.roomId === roomId && fs.tileId === tileId))
      );
      toast.success("Floor tile removed");
    } catch (error) {
      toast.error("Failed to remove tile");
    }
  };

  const handleChangeLayerTile = (roomId: string, layerNumber: number) => {
    setCatalogContext({ roomId, isWallTile: true, layerNumber });
    setShowTileCatalog(true);
  };

  const handleCopyTileToAllLayers = (roomId: string, tileId: string) => {
    setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId
          ? {
              ...ws,
              layers: ws.layers.map(layer => ({ ...layer, tileId }))
            }
          : ws
      )
    );
    toast.success("Tile copied to all layers");
  };

  const handleDeleteLayer = (roomId: string, layerNumber: number) => {
    setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId
          ? {
              ...ws,
              layers: ws.layers.filter(layer => layer.layerNumber !== layerNumber),
              totalLayers: Math.max(1, ws.totalLayers - 1)
            }
          : ws
      )
    );
    toast.success(`Layer ${layerNumber} deleted`);
  };

  const handleSaveSelections = async () => {
    const selectionsToSave: { customer_id: string; room_id: string; tile_id: string; layer_number?: number }[] = [];
    
    // Floor tile selections
    floorTileSelections.forEach(fs => {
      selectionsToSave.push({
        customer_id: customerId,
        room_id: fs.roomId,
        tile_id: fs.tileId
      });
    });

    // Wall tile selections
    wallTileSelections.forEach(ws => {
      ws.layers.forEach(layer => {
        selectionsToSave.push({
          customer_id: customerId,
          room_id: ws.roomId,
          tile_id: layer.tileId,
          layer_number: layer.layerNumber
        });
      });
    });

    try {
      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      toast.success("Tile selections saved successfully!");
    } catch (error) {
      console.error("Error saving selections:", error);
      toast.error("Failed to save selections");
    }
  };

  const getWastagePercentage = (): number => {
    const parsed = parseFloat(wastagePercentage);
    return isNaN(parsed) ? 10 : Math.max(0, Math.min(15, parsed));
  };

  const handleGenerateQuotation = () => {
    const hasFloorTiles = floorTileSelections.length > 0;
    const hasWallTiles = wallTileSelections.some(ws => ws.layers.length > 0);
    
    if (!hasFloorTiles && !hasWallTiles) {
      toast.error("Please select tiles for at least one room before generating quotation");
      return;
    }
    setShowQuotationForm(true);
  };

  const calculations = calculateTileRequirements(
    floorTileSelections,
    wallTileSelections,
    rooms,
    tiles,
    getWastagePercentage()
  );
  const grandTotal = calculateGrandTotal(calculations);

  const prepareQuotationData = () => {
    return prepareQuotationItems(
      floorTileSelections,
      wallTileSelections,
      rooms,
      tiles,
      getWastagePercentage()
    );
  };

  if (tilesLoading || selectionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showQuotationForm) {
    return (
      <QuotationForm
        preSelectedCustomerId={customerId}
        selectedRoomsData={prepareQuotationData()}
        wastagePercentage={getWastagePercentage()}
        onBack={() => setShowQuotationForm(false)}
        onSuccess={() => {
          setShowQuotationForm(false);
          toast.success("Quotation generated successfully!");
          onBack();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">Select Tiles for Rooms</h2>
          <p className="text-gray-600">Configure floor and wall tiles with advanced layering options</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Floor Rooms */}
        {floorRooms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Floor Rooms ({floorRooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {floorRooms.map(room => {
                const roomSelections = floorTileSelections.filter(fs => fs.roomId === room.id);
                return (
                  <div key={room.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{room.name}</h4>
                      <Button
                        size="sm"
                        onClick={() => handleAddFloorTile(room.id)}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Tile
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {room.length} × {room.width} {room.unit} ({calculateAreaInSquareFeet(room.length, room.width, room.unit).toFixed(2)} sq ft)
                    </p>
                    
                    {roomSelections.length > 0 ? (
                      <div className="space-y-2">
                        {roomSelections.map(fs => {
                          const tile = tiles.find(t => t.id === fs.tileId);
                          return tile ? (
                            <div key={fs.tileId} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                              <div>
                                <p className="font-medium">{tile.name}</p>
                                <p className="text-gray-500">{tile.code}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveFloorTile(room.id, fs.tileId)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No tiles selected</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Wall Rooms */}
        {wallRooms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Wall Rooms ({wallRooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {wallRooms.map(room => {
                const wallSelection = wallTileSelections.find(ws => ws.roomId === room.id);
                return (
                  <div key={room.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{room.name}</h4>
                      <Button
                        size="sm"
                        onClick={() => handleConfigureWallTiles(room.id)}
                        className="gap-1"
                      >
                        <Layers className="h-3 w-3" />
                        Configure
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {room.wall_height || 0} × {room.wall_length || room.length || 0} {room.unit} 
                      ({calculateAreaInSquareFeet(room.wall_height || 0, room.wall_length || room.length || 0, room.unit).toFixed(2)} sq ft)
                    </p>
                    
                    {wallSelection && wallSelection.layers.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-blue-600">
                          {wallSelection.totalLayers} layers configured
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {wallSelection.layers.map(layer => {
                            const tile = tiles.find(t => t.id === layer.tileId);
                            return tile ? (
                              <div key={layer.layerNumber} className="flex items-center justify-between bg-blue-50 p-2 rounded text-xs">
                                <div>
                                  <p className="font-medium">Layer {layer.layerNumber}: {tile.name}</p>
                                  <p className="text-gray-500">{tile.code} ({layer.tilesNeeded} tiles)</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleChangeLayerTile(room.id, layer.layerNumber)}
                                    title="Change tile for this layer"
                                  >
                                    Change
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyTileToAllLayers(room.id, layer.tileId)}
                                    title="Copy this tile to all layers"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  {wallSelection.layers.length > 1 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteLayer(room.id, layer.layerNumber)}
                                      title="Delete this layer"
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No wall tiles configured</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Calculations & Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              Calculations & Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wastage Percentage Input */}
            <div>
              <Label htmlFor="wastage" className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Wastage % (Max 15%)
              </Label>
              <Input
                id="wastage"
                type="text"
                value={wastagePercentage}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers and decimal points
                  if (/^\d*\.?\d*$/.test(value)) {
                    const numValue = parseFloat(value);
                    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 15)) {
                      setWastagePercentage(value);
                    }
                  }
                }}
                placeholder="0-15"
                className="mt-1"
              />
            </div>

            {/* Tile Calculations */}
            {calculations.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Tile Requirements:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {calculations.map((calc, index) => (
                    <div key={index} className="border rounded p-2 text-xs bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{calc.tile.name}</p>
                        <Badge variant={calc.isWallTile ? "secondary" : "default"} className="text-xs">
                          {calc.isWallTile ? "Wall" : "Floor"}
                        </Badge>
                      </div>
                      <p className="text-gray-500 mb-2">{calc.tile.code}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-gray-500">Tiles</p>
                          <p className="font-medium">{calc.tilesNeeded}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Boxes</p>
                          <p className="font-medium">{calc.boxesNeeded}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Price</p>
                          <p className="font-medium">₹{calc.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Grand Total:</span>
                    <span className="font-bold text-green-600 text-lg">₹{grandTotal.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Includes {getWastagePercentage()}% wastage</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center text-sm">No tiles selected</p>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4 border-t">
              <Button
                onClick={handleSaveSelections}
                disabled={floorTileSelections.length === 0 && wallTileSelections.length === 0}
                className="w-full"
              >
                Save Selections
              </Button>
              <Button
                onClick={handleGenerateQuotation}
                disabled={calculations.length === 0}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Generate Quotation
              </Button>
            </div>
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