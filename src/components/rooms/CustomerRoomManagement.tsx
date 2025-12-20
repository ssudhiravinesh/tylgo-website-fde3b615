import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Edit, Trash2, Ruler, Calculator, ArrowRight, ArrowLeft, Layers, Footprints } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useDeleteRoom } from "@/hooks/useRooms";
import { useStaircasesByCustomer, useDeleteStaircase } from "@/hooks/useStaircases";
import { RoomFormDialog } from "./RoomFormDialog";
import { StaircaseFormDialog } from "./StaircaseFormDialog";
import { TileSelectionStep } from "./TileSelectionStep";
import { DirectCustomerSearch } from "./DirectCustomerSearch";
import { DeleteRoomDialog } from "./DeleteRoomDialog";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";
import type { Staircase } from "@/hooks/useStaircases";

interface CustomerRoomManagementProps {
  preSelectedCustomerId?: string | null;
  onBack?: () => void;
}

export const CustomerRoomManagement = ({ preSelectedCustomerId, onBack }: CustomerRoomManagementProps) => {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preSelectedCustomerId || "");
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsByCustomer(selectedCustomerId);
  const { data: staircases = [], isLoading: staircasesLoading } = useStaircasesByCustomer(selectedCustomerId);
  const deleteRoomMutation = useDeleteRoom();
  const deleteStaircaseMutation = useDeleteStaircase();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStaircaseFormOpen, setIsStaircaseFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingStaircase, setEditingStaircase] = useState<Staircase | null>(null);
  const [showTileSelection, setShowTileSelection] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; room: Room | null }>({
    isOpen: false,
    room: null
  });
  const [deleteStaircaseDialog, setDeleteStaircaseDialog] = useState<{ isOpen: boolean; staircase: Staircase | null }>({
    isOpen: false,
    staircase: null
  });

  useEffect(() => {
    if (preSelectedCustomerId) {
      setSelectedCustomerId(preSelectedCustomerId);
    }
  }, [preSelectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (room: Room) => {
    setDeleteDialog({ isOpen: true, room });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.room) return;
    
    try {
      await deleteRoomMutation.mutateAsync(deleteDialog.room.id);
      toast.success("Room deleted successfully!");
      setDeleteDialog({ isOpen: false, room: null });
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const handleEditStaircase = (staircase: Staircase) => {
    setEditingStaircase(staircase);
    setIsStaircaseFormOpen(true);
  };

  const handleDeleteStaircaseClick = (staircase: Staircase) => {
    setDeleteStaircaseDialog({ isOpen: true, staircase });
  };

  const handleConfirmDeleteStaircase = async () => {
    if (!deleteStaircaseDialog.staircase) return;
    
    try {
      await deleteStaircaseMutation.mutateAsync(deleteStaircaseDialog.staircase.id);
      toast.success("Staircase deleted successfully!");
      setDeleteStaircaseDialog({ isOpen: false, staircase: null });
    } catch (error) {
      console.error("Error deleting staircase:", error);
      toast.error("Failed to delete staircase");
    }
  };

  const handleCloseStaircaseForm = () => {
    setIsStaircaseFormOpen(false);
    setEditingStaircase(null);
  };

  const calculateArea = (room: Room) => {
    // If using the new aggregation logic, the length holds the total area and width is 1
    // But for legacy rooms, we calculate L * W
    if (room.room_type === "wall") {
      return ((room.wall_height || 0) * (room.wall_length || 0)).toFixed(2);
    }
    return (room.length * room.width).toFixed(2);
  };

  const handleProceedToTileSelection = () => {
    if (rooms.length === 0 && staircases.length === 0) {
      toast.error("Please add at least one room or staircase before selecting tiles");
      return;
    }
    setShowTileSelection(true);
  };

  const handleBackToRooms = () => {
    setShowTileSelection(false);
  };

  // Helper to render dimensions correctly (handling both Multi-Shape and Legacy)
  const renderRoomDimensions = (room: Room) => {
    // 1. Check for Multi-Shape Data
    if (room.measurements && room.measurements.length > 0) {
    return (
      <div className="space-y-2 bg-gray-50 p-2 rounded-md border border-gray-100">
        <div className="flex items-center justify-between mb-1">
           <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
             <Layers className="h-3 w-3" />
             Dimensions ({room.measurements.length} Shapes)
           </span>
        </div>
        <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
          {room.measurements.map((m, idx) => (
            <div key={idx} className="flex justify-between text-sm border-b border-gray-200 last:border-0 pb-1 last:pb-0 border-dashed">
              <span className="text-gray-600 text-xs">Shape {idx + 1}:</span>
              {/* FIXED: Applied formatting logic here */}
              <span className="text-xs font-medium" style={{ fontFamily: "'Manrope', sans-serif", color: "black" }}>
                {parseFloat(m.length).toFixed(2)} × {parseFloat(m.width).toFixed(2)} {room.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

    // 2. Fallback for Legacy Data
    const isFloor = room.room_type === "floor";
    const l = isFloor ? room.length : room.wall_length;
    const w = isFloor ? room.width : room.wall_height;
    const lLabel = isFloor ? "Length" : "Length";
    const wLabel = isFloor ? "Width" : "Height";

    return (
      <div className="grid grid-cols-2 gap-2 text-sm bg-white p-2 rounded border border-dashed border-gray-200">
        <div className="flex items-center gap-1">
          <Ruler className="h-3 w-3 text-gray-400" />
          <span className="text-gray-500 text-xs">{lLabel}:</span>
        </div>
        <span className="font-medium text-right">{l} {room.unit}</span>
        
        <div className="flex items-center gap-1">
          <Ruler className="h-3 w-3 text-gray-400" />
          <span className="text-gray-500 text-xs">{wLabel}:</span>
        </div>
        <span className="font-medium text-right">{w} {room.unit}</span>
      </div>
    );
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

  // Add keyframe animations using a style tag
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes tileAnimation {
      0%, 80%, 100% {
        transform: scale(1) rotate(0deg);
        opacity: 0.7;
      }
      40% {
        transform: scale(1.2) rotate(180deg);
        opacity: 1;
      }
    }
    
    @keyframes progressFlow {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `;
  document.head.appendChild(styleSheet);

  
  if (customersLoading) {
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

  if (showTileSelection && selectedCustomerId && (rooms.length > 0 || staircases.length > 0)) {
    return (
      <TileSelectionStep
        customerId={selectedCustomerId}
        rooms={rooms}
        staircases={staircases}
        onBack={handleBackToRooms}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Customer Room Management</h1>
            <p className="text-gray-600">Manage room dimensions for tile calculations</p>
          </div>
        </div>
      </div>

      {/* Customer Search - Always show if no preselected customer */}
      {!preSelectedCustomerId && (
        <div className="w-full">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Home className="h-5 w-5" />
              Select Customer
            </h2>
          </div>
          <DirectCustomerSearch
            value={selectedCustomerId}
            onValueChange={setSelectedCustomerId}
            placeholder="Search customers by name, mobile, or address..."
          />
        </div>
      )}

      {/* Creative Empty State when no customer is selected */}
      {!preSelectedCustomerId && !selectedCustomerId && (
        <div className="text-center py-16">
          <div className="animate-bounce mb-6">
            <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <Home className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Ready to Design Amazing Spaces?</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Select a customer above to start managing their rooms and create beautiful tile layouts. 
            Each room you add brings us closer to their dream space! 🏠✨
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Room Management</h4>
                <p className="text-sm text-gray-600">Add and manage room dimensions with precision</p>
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Smart Calculations</h4>
                <p className="text-sm text-gray-600">Automatic tile calculations and cost estimates</p>
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="text-center">
                <div className="h-12 w-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ArrowRight className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Seamless Flow</h4>
                <p className="text-sm text-gray-600">From room setup to quotation in minutes</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Selected Customer Info & Action Buttons */}
      {selectedCustomer && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-blue-50 rounded-lg border">
          <div>
            <h3 className="font-semibold text-gray-800">{selectedCustomer.name}</h3>
            <p className="text-sm text-gray-600">Mobile: {selectedCustomer.mobile}</p>
            {selectedCustomer.address && (
              <p className="text-sm text-gray-600">Address: {selectedCustomer.address}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => setIsFormOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
            <Button 
              onClick={() => setIsStaircaseFormOpen(true)}
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Footprints className="h-4 w-4" />
              Add Staircase
            </Button>
            {(rooms.length > 0 || staircases.length > 0) && (
              <Button 
                onClick={handleProceedToTileSelection}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                Select Tiles
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Rooms Display */}
      {selectedCustomerId && (
        <>
          {roomsLoading ? (
           <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
            <div className="text-center">
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
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No rooms found</h3>
              <p className="text-gray-500 mb-4">Add the first room for this customer</p>
              <Button 
                onClick={() => setIsFormOpen(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card 
                  key={room.id} 
                  className="hover:shadow-lg transition-all border-gray-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Home className="h-5 w-5 text-blue-600" />
                        {room.name}
                        <Badge 
                          variant={room.room_type === "floor" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {room.room_type === "floor" ? "Floor" : "Wall"}
                        </Badge>
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(room)}
                          className="flex items-center gap-1 px-2 py-1 h-auto hover:bg-blue-100"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 text-sm">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(room)}
                          className="h-8 w-8 p-0 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    
                    {/* Dynamic Dimension Rendering */}
                    {renderRoomDimensions(room)}
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Calculator className="h-3 w-3 text-green-600" />
                          <span className="text-gray-600">
                            {room.room_type === "floor" ? "Total Floor Area:" : "Total Wall Area:"}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          {calculateArea(room)} {room.unit}²
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Staircases Display */}
          {staircases.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Footprints className="h-5 w-5 text-orange-600" />
                Staircases ({staircases.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {staircases.map((staircase) => (
                  <Card 
                    key={staircase.id} 
                    className="hover:shadow-lg transition-all border-orange-200 bg-gradient-to-br from-orange-50 to-white"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Footprints className="h-5 w-5 text-orange-600" />
                          {staircase.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStaircase(staircase)}
                            className="flex items-center gap-1 px-2 py-1 h-auto hover:bg-orange-100"
                          >
                            <Edit className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-600 text-sm">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStaircaseClick(staircase)}
                            className="h-8 w-8 p-0 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{staircase.number_of_steps}</p>
                          <p className="text-xs text-gray-500">Steps</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">{staircase.number_of_risers}</p>
                          <p className="text-xs text-gray-500">Risers</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Calculator className="h-3 w-3 text-green-600" />
                            <span className="text-gray-600">Total Tiles Needed:</span>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            {staircase.number_of_steps + staircase.number_of_risers} tiles
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <RoomFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        room={editingRoom}
        customerId={selectedCustomerId}
      />

      <StaircaseFormDialog
        isOpen={isStaircaseFormOpen}
        onClose={handleCloseStaircaseForm}
        staircase={editingStaircase}
        customerId={selectedCustomerId}
      />

      <DeleteRoomDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ isOpen: open, room: null })}
        onConfirm={handleConfirmDelete}
        roomName={deleteDialog.room?.name || ""}
      />

      {/* Delete Staircase Dialog */}
      <DeleteRoomDialog
        isOpen={deleteStaircaseDialog.isOpen}
        onOpenChange={(open) => setDeleteStaircaseDialog({ isOpen: open, staircase: null })}
        onConfirm={handleConfirmDeleteStaircase}
        roomName={deleteStaircaseDialog.staircase?.name || ""}
      />
    </div>
  );
};
