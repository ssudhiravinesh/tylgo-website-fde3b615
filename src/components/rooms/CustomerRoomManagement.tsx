import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Edit, Trash2, Ruler, Calculator, ArrowRight, ArrowLeft } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useDeleteRoom } from "@/hooks/useRooms";
import { RoomFormDialog } from "./RoomFormDialog";
import { TileSelectionStep } from "./TileSelectionStep";
import { DirectCustomerSearch } from "./DirectCustomerSearch"; // Import the new component
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";

interface CustomerRoomManagementProps {
  preSelectedCustomerId?: string | null;
  onBack?: () => void;
}

export const CustomerRoomManagement = ({ preSelectedCustomerId, onBack }: CustomerRoomManagementProps) => {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preSelectedCustomerId || "");
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsByCustomer(selectedCustomerId);
  const deleteRoomMutation = useDeleteRoom();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showTileSelection, setShowTileSelection] = useState(false);

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

  const handleDelete = async (roomId: string, roomName: string) => {
    if (window.confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone.`)) {
      try {
        await deleteRoomMutation.mutateAsync(roomId);
        toast.success("Room deleted successfully!");
      } catch (error) {
        console.error("Error deleting room:", error);
        toast.error("Failed to delete room");
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const calculateArea = (room: Room) => {
    return (room.length * room.width).toFixed(2);
  };

  const handleProceedToTileSelection = () => {
    if (rooms.length === 0) {
      toast.error("Please add at least one room before selecting tiles");
      return;
    }
    setShowTileSelection(true);
  };

  const handleBackToRooms = () => {
    setShowTileSelection(false);
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showTileSelection && selectedCustomerId && rooms.length > 0) {
    return (
      <TileSelectionStep
        customerId={selectedCustomerId}
        rooms={rooms}
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

      {/* Selected Customer Info & Add Room Button */}
      {selectedCustomer && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-blue-50 rounded-lg border">
          <div>
            <h3 className="font-semibold text-gray-800">{selectedCustomer.name}</h3>
            <p className="text-sm text-gray-600">Mobile: {selectedCustomer.mobile}</p>
            {selectedCustomer.address && (
              <p className="text-sm text-gray-600">Address: {selectedCustomer.address}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
            {rooms.length > 0 && (
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
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                <Card key={room.id} className="hover:shadow-lg transition-shadow border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Home className="h-5 w-5 text-blue-600" />
                        {room.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(room)}
                          className="h-8 w-8 p-0 hover:bg-blue-100"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(room.id, room.name)}
                          className="h-8 w-8 p-0 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Length:</span>
                      </div>
                      <span className="font-medium">{room.length} {room.unit}</span>
                      
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Width:</span>
                      </div>
                      <span className="font-medium">{room.width} {room.unit}</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Calculator className="h-3 w-3 text-green-600" />
                          <span className="text-gray-600">Floor Area:</span>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          {calculateArea(room)} {room.unit}²
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
    </div>
  );
};