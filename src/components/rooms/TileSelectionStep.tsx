import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Percent, Plus, Trash2, Calculator, Package, IndianRupee, Layers, Copy, Minus, Eye } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { WallTileSelectionPage } from "./WallTileSelectionPage";
import { FloorTilePreview } from "@/components/tiles/FloorTilePreview";
import { toast } from "sonner";
import { formatArea, decimalFeetToFeetInches } from "@/utils/unitConversions";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import { 
  calculateTileRequirements, 
  calculateGrandTotal, 
  prepareQuotationItems,
  formatTileBreakdown,
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
interface CatalogContext {
  roomId: string;
  roomName: string;  // Now properly included
  isWallTile: boolean;
  layerNumber?: number;
}


export const TileSelectionStep = ({ customerId, rooms, onBack }: TileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  
  const [floorTileSelections, setFloorTileSelections] = useState<FloorTileSelection[]>([]);
  const [wallTileSelections, setWallTileSelections] = useState<WallTileSelection[]>([]);
  const [wastagePercentage, setWastagePercentage] = useState<string>("0");
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [catalogContext, setCatalogContext] = useState<{
    roomId: string;
    isWallTile: boolean;
    layerNumber?: number;
  } | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showWallTileSelection, setShowWallTileSelection] = useState<{
    roomId: string;
    room: Room;
  } | null>(null);
  const [showFloorPreview, setShowFloorPreview] = useState<{
    room: Room;
    tile: Tile | null;
  } | null>(null);
  useEffect(() => {
    console.log('📊 floorTileSelections changed:', floorTileSelections);
    console.trace('📊 Stack trace for state change');
  }, [floorTileSelections]);

  // Step 4: Monitor component mounting/unmounting
  useEffect(() => {
    console.log('🟢 TileSelectionStep mounted');
    return () => {
      console.log('🔴 TileSelectionStep unmounted');
    };
  }, []);
  const floorRooms = rooms.filter(room => room.room_type === "floor");
  const wallRooms = rooms.filter(room => room.room_type === "wall");

  useEffect(() => {
    // Only run if we have selections and tiles data, and prevent unnecessary updates
    if (selections.length === 0 && tiles.length === 0) return;

    // Initialize selections from database
    const floorSelections: FloorTileSelection[] = [];
    const wallSelections: WallTileSelection[] = [];

    selections.forEach(selection => {
      const room = rooms.find(r => r.id === selection.room_id);
      if (!room) return;

      if (room.room_type === "floor") {
        // Check if this floor selection already exists to prevent duplicates
        const existingFloorSelection = floorSelections.find(
          fs => fs.roomId === selection.room_id && fs.tileId === selection.tile_id
        );
        if (!existingFloorSelection) {
          floorSelections.push({
            roomId: selection.room_id,
            tileId: selection.tile_id
          });
        }
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
          // Calculate tilesNeeded for this layer
          const baseTile = tiles.find(t => t.id === selection.tile_id);
          let tilesNeeded = 0;
          
          if (baseTile && room) {
            const wallHeight = room.wall_height || 0;
            const wallLength = room.wall_length || room.length || 0;
            
            let tileHeightInRoomUnit: number;
            let tileLengthInRoomUnit: number;
            
            if (room.unit === "feet") {
              tileHeightInRoomUnit = (baseTile.size_length || 0) / 304.8;
              tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 304.8;
            } else if (room.unit === "metre") {
              tileHeightInRoomUnit = (baseTile.size_length || 0) / 1000;
              tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 1000;
            } else {
              tileHeightInRoomUnit = baseTile.size_length || 0;
              tileLengthInRoomUnit = baseTile.size_breadth || 0;
            }
            
            if (tileHeightInRoomUnit > 0 && tileLengthInRoomUnit > 0) {
              tilesNeeded = Math.ceil(wallLength / tileLengthInRoomUnit);
            }
          }
          
          wallSelection.layers.push({
            layerNumber,
            tileId: selection.tile_id,
            tilesNeeded
          });
        }
      }
    });

    // Calculate totalLayers for each wall selection
    wallSelections.forEach(ws => {
      ws.totalLayers = Math.max(ws.layers.length, 1);
      // Set baseTileId to the first tile if not already set
      if (!ws.baseTileId && ws.layers.length > 0) {
        ws.baseTileId = ws.layers[0].tileId;
      }
    });

    // Only update state if the data has actually changed
    setFloorTileSelections(prev => {
      const isEqual = JSON.stringify(prev) === JSON.stringify(floorSelections);
      return isEqual ? prev : floorSelections;
    });
    
    setWallTileSelections(prev => {
      const isEqual = JSON.stringify(prev) === JSON.stringify(wallSelections);
      return isEqual ? prev : wallSelections;
    });
  }, [selections, rooms, tiles]);

    const handleAddFloorTile = (roomId: string) => {
      const room = floorRooms.find(r => r.id === roomId);
      if (!room) return;
      setCatalogContext({
        roomId,
        isWallTile: false,
        roomName: room.name
      });
      setShowTileCatalog(true);
    };

  if (!catalogContext) return;
const { roomId, roomName, isWallTile, layerNumber } = catalogContext;
toast.success(`${tileName} assigned to ${roomName} successfully!`);
  
const handleAutoAssignTile = async (tileId: string) => {
  console.log('🔵 handleAutoAssignTile START:', { tileId, catalogContext });
  
  if (!catalogContext) {
    console.error('No catalogContext available');
    toast.error('Room context not found');
    return;
  }

  const { roomId, isWallTile } = catalogContext;
  
  if (!isWallTile) {
    const existingSelection = floorTileSelections.find(
      fs => fs.roomId === roomId && fs.tileId === tileId
    );
    
    if (existingSelection) {
      toast.error("This tile is already selected for this room");
      return;
    }

    try {
      const newSelection = { roomId, tileId };
      console.log('🔵 Adding selection:', newSelection);
      
      setFloorTileSelections(prev => {
        const updated = [...prev, newSelection];
        console.log('🔵 State updated to:', updated);
        return updated;
      });
      
      // Create complete selections for saving
      const updatedFloorSelections = [...floorTileSelections, newSelection];
      const selectionsToSave = [];
      
      updatedFloorSelections.forEach(fs => {
        selectionsToSave.push({
          customer_id: customerId,
          room_id: fs.roomId,
          tile_id: fs.tileId
        });
      });

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

      console.log('🔵 Calling save mutation with:', selectionsToSave);
      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      console.log('✅ Save successful!');
      
      const selectedTile = tiles.find(t => t.id === tileId);
      const tileName = selectedTile?.name || 'Tile';
      toast.success(`${tileName} assigned to ${catalogContext.roomName} successfully!`);
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        status: error?.status,
        response: error?.response?.data
      });
      
      console.log('🔄 Rolling back state...');
      setFloorTileSelections(prev => {
        const rolledBack = prev.filter(fs => !(fs.roomId === roomId && fs.tileId === tileId));
        console.log('🔄 State rolled back to:', rolledBack);
        return rolledBack;
      });
      
      // Show specific error message
      let errorMessage = "Failed to save tile assignment";
      if (error?.status === 400) {
        errorMessage = "Invalid tile selection data";
      } else if (error?.status === 401) {
        errorMessage = "Authentication required";
      } else if (error?.status === 403) {
        errorMessage = "Permission denied";
      } else if (error?.status >= 500) {
        errorMessage = "Server error. Please try again.";
      }
      
      toast.error(errorMessage);
      return;
    }
  }

  console.log('🔵 handleAutoAssignTile END - closing dialog');
  setShowTileCatalog(false);
  setCatalogContext(null);
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

    // Open wall tile selection page
    setShowWallTileSelection({ roomId, room });
  };

    const styles = {
  tilesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 20px)',
    gridTemplateRows: 'repeat(3, 20px)',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  tile: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    animation: 'tileAnimation 1.2s ease-in-out infinite',
  },
  tileBlue: {
    backgroundColor: '#3B82F6',
  },
  tileBeige: {
    backgroundColor: '#F5F5DC',
  },
  tileLight: {
    backgroundColor: '#93C5FD',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  progressBar: {
    width: '200px',
    height: '4px',
    backgroundColor: '#E5E7EB',
    borderRadius: '2px',
    overflow: 'hidden',
    margin: '0 auto',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(90deg, #3B82F6, #93C5FD, #3B82F6)',
    backgroundSize: '200% 100%',
    animation: 'progressFlow 2s linear infinite',
  },
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

    console.log('Wall calculation:', {
      wallHeight,
      wallLength,
      tileHeightInRoomUnit,
      tileLengthInRoomUnit,
      layerCount,
      tilesPerLayer,
      totalTilesNeeded: layerCount * tilesPerLayer
    });

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

  const handleSaveSelections = async (newSelections?: FloorTileSelection[]) => {
    // Use provided selections or current state
    const selectionsToUse = newSelections || floorTileSelections;
    
    const selectionsToSave: { 
      customer_id: string; 
      room_id: string; 
      tile_id: string; 
      layer_number?: number 
    }[] = [];
    
    // Floor tile selections
    selectionsToUse.forEach(fs => {
      selectionsToSave.push({
        customer_id: customerId,
        room_id: fs.roomId,
        tile_id: fs.tileId
      });
    });
  
    // Wall tile selections (existing logic)
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
    } catch (error) {
      console.error("Error saving selections:", error);
      throw error; // Re-throw for handling in calling function
    }
  };

  const getWastagePercentage = (): number => {
    const parsed = parseFloat(wastagePercentage);
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(15, parsed));
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
       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
            <div className="text-center">
              {/* Tile Loading Animation */}
              <div style={styles.tilesContainer}>
                {[...Array(12)].map((_, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.tile,
                      ...styles[`tile${index % 3 === 0 ? 'Blue' : index % 3 === 1 ? 'Beige' : 'Light'}`],
                      animationDelay: `${index * 0.08}s`
                    }}
                  />
                ))}
              </div>
              
              <p style={styles.loadingText}>Loading...</p>
              
              <div style={styles.progressBar}>
                <div style={styles.progressFill}></div>
              </div>
            </div>
          </div>
    );
  }

  if (showWallTileSelection) {
    const wallSelection = wallTileSelections.find(ws => ws.roomId === showWallTileSelection.roomId) || {
      roomId: showWallTileSelection.roomId,
      baseTileId: null,
      layers: [],
      totalLayers: 0
    };

    return (
      <WallTileSelectionPage
        room={showWallTileSelection.room}
        wallSelection={wallSelection}
        tiles={tiles}
        onBack={() => setShowWallTileSelection(null)}
        onUpdateSelection={(selection) => {
          setWallTileSelections(prev =>
            prev.map(ws =>
              ws.roomId === selection.roomId ? selection : ws
            ).concat(
              prev.find(ws => ws.roomId === selection.roomId) ? [] : [selection]
            )
          );
        }}
      />
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

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Rooms Section */}
        <div className="space-y-6 lg:col-span-2">
          {/* Floor Rooms */}
          {floorRooms.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-green-600" />
                  Floor Rooms ({floorRooms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {floorRooms.map(room => {
                  const roomSelections = floorTileSelections.filter(fs => fs.roomId === room.id);
                  return (
                    <div key={room.id} className="border rounded-lg p-4 bg-green-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-base">{room.name}</h4>
                          <p className="text-sm text-gray-600">
                            {decimalFeetToFeetInches(room.length)} × {decimalFeetToFeetInches(room.width)}
                          </p>
                          <p className="text-sm text-gray-600">
                            ({formatArea(calculateAreaInSquareFeet(room.length, room.width, room.unit))})
                          </p>
                        </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAddFloorTile(room.id)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Tile
                            </Button>
                            {roomSelections.length > 0 && (
                              <Button
                                variant="outline"
                                onClick={() => setShowFloorPreview({ room, tile: tiles.find(t => t.id === roomSelections[0].tileId) })}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Preview
                              </Button>
                            )}
                          </div>
                      </div>
                      
                      {roomSelections.length > 0 ? (
                        <div className="space-y-3">
                          {roomSelections.map((fs, index) => {
                            const tile = tiles.find(t => t.id === fs.tileId);
                            return tile ? (
                              <div key={`${fs.roomId}-${fs.tileId}-${index}`} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                                <div>
                                  <p className="font-semibold">{tile.name}</p>
                                  <p className="text-sm text-gray-600">{tile.code}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveFloorTile(room.id, fs.tileId)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No tiles selected</p>
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
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Wall Rooms ({wallRooms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wallRooms.map(room => {
                  const wallSelection = wallTileSelections.find(ws => ws.roomId === room.id);
                  return (
                    <div key={room.id} className="border rounded-lg p-4 bg-blue-50/50">
                      <div className="flex items-center justify-between mb-3">
                         <div>
                           <h4 className="font-semibold text-base">{room.name}</h4>
                           <p className="text-sm text-gray-600">
                             {decimalFeetToFeetInches(room.wall_length || room.length || 0)} × {decimalFeetToFeetInches(room.wall_height || 0)}
                           </p>
                           <p className="text-sm text-gray-600">
                             ({formatArea(calculateAreaInSquareFeet(room.wall_height || 0, room.wall_length || room.length || 0, room.unit))})
                           </p>
                         </div>
                        <Button
                          onClick={() => handleConfigureWallTiles(room.id)}
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
                                   {wallSelection.layers.reduce((sum, layer) => sum + layer.tilesNeeded, 0)}
                                </span>
                              </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <p className="text-sm text-gray-600">Click Configure to manage layers and tiles</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No wall tiles configured</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary & Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-green-600" />
              Summary & Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wastage Percentage */}
            <div>
                <Label htmlFor="wastage" className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4" />
                  Wastage Percentage (0-15%)
                </Label>
                <Input
                  id="wastage"
                  type="text"
                  value={wastagePercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d*$/.test(value)) {
                      const numValue = parseFloat(value);
                      if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 15)) {
                        setWastagePercentage(value);
                      }
                    }
                  }}
                  placeholder="Enter 0-15"
                  className="text-center"
                />
            </div>

            {/* Calculations Summary */}
            {calculations.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-green-50 p-3 rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-bold text-green-600 text-xl">₹{grandTotal.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-600">Includes {getWastagePercentage()}% wastage</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Breakdown:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {calculations.map((calc, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex-1">
                            <span className="font-medium truncate">{calc.tile.name}</span>
                            {calc.isWallTile && calc.wallLayers && calc.wallLayers.length > 0 && (
                              <span className="text-gray-500 text-xs ml-2">
                                (Layer{calc.wallLayers.length > 1 ? 's' : ''}: {calc.wallLayers.sort((a, b) => a - b).join(', ')})
                              </span>
                            )}
                          </div>
                          <Badge variant={calc.isWallTile ? "secondary" : "default"} className="text-xs">
                            {calc.isWallTile ? "Wall" : "Floor"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                           <div className="text-center">
                             <p className="text-gray-500">Tiles Required</p>
                             <p className="font-medium">
                               {formatTileBreakdown(
                                 calc.rawTilesNeeded,
                                 calc.fullBoxes,
                                 calc.leftoverTiles,
                                 parseInt(calc.tile.pieces_per_box?.toString() || '1'),
                                 getWastagePercentage()
                               )}
                             </p>
                           </div>

                          <div className="text-center">
                            <p className="text-gray-500">Boxes</p>
                            <p className="font-medium">{calc.boxesNeeded}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Amount</p>
                            <p className="font-medium">₹{calc.totalPrice.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Calculator className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Select tiles to see calculations</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4 border-t">
              <Button
                onClick={handleSaveSelections}
                disabled={floorTileSelections.length === 0 && wallTileSelections.length === 0}
                className="w-full"
                size="lg"
              >
                Save Selections
              </Button>
              <Button
                onClick={handleGenerateQuotation}
                disabled={calculations.length === 0}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Generate Quotation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={showTileCatalog} onOpenChange={setShowTileCatalog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {catalogContext ?
                `Select Tile for ${catalogContext.roomName}` :
                'Select Tiles'
                }
              </DialogTitle>
            </DialogHeader>
          <TileCatalog
            isSelectionMode={true}
            onTileSelect={handleTileSelected}
            autoAssignmentContext={catalogContext}
            onAutoAssignment={handleAutoAssignTile}
            onNavigateBack={() => {
            setShowTileCatalog(false);
            setCatalogContext(null);
            }}
          />
          </DialogContent>
      </Dialog>


      <FloorTilePreview
        isOpen={!!showFloorPreview}
        onClose={() => setShowFloorPreview(null)}
        tile={showFloorPreview?.tile || null}
        area={showFloorPreview ? calculateAreaInSquareFeet(showFloorPreview.room.length, showFloorPreview.room.width, showFloorPreview.room.unit) : 0}
        unit="ft"
      />
    </div>
  );
};
