
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Home, Square, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RoomFormDialog } from "./RoomFormDialog";
import { TileSelectionStep } from "./TileSelectionStep";
import { useTiles } from "@/hooks/useTiles";
import type { Customer } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useDeleteRoom, type Room } from "@/hooks/useRooms";

interface CustomerRoomManagementProps {
  customer: Customer;
  onBack?: () => void;
}

export const CustomerRoomManagement = ({ customer, onBack }: CustomerRoomManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showTileSelection, setShowTileSelection] = useState(false);
  
  const { data: rooms = [], isLoading, refetch } = useRoomsByCustomer(customer.id);
  const { data: tiles = [] } = useTiles();
  const deleteRoomMutation = useDeleteRoom();

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsDialogOpen(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (window.confirm("Are you sure you want to delete this room? This will also remove all associated tile selections and quotation items.")) {
      try {
        await deleteRoomMutation.mutateAsync(roomId);
        toast.success("Room deleted successfully");
        refetch();
      } catch (error) {
        console.error("Error deleting room:", error);
        toast.error("Failed to delete room");
      }
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
    refetch();
  };

  const getRoomIcon = (roomType: string) => {
    return roomType === 'wall' ? <Square className="h-4 w-4" /> : <Home className="h-4 w-4" />;
  };

  const getRoomDimensions = (room: Room) => {
    if (room.room_type === 'wall') {
      return `${room.wall_height || 0} × ${room.wall_length || 0} ${room.unit}`;
    } else {
      return `${room.length} × ${room.width} ${room.unit}`;
    }
  };

  const getRoomTypeLabel = (roomType: string) => {
    return roomType === 'wall' ? 'Wall' : 'Floor';
  };

  if (showTileSelection) {
    return (
      <div>
        <Button 
          onClick={() => setShowTileSelection(false)} 
          variant="outline" 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </Button>
        <TileSelectionStep 
          customer={customer}
          rooms={rooms}
          tiles={tiles}
        />
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {onBack && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Home className="h-5 w-5" />
            Rooms for {customer.name}
          </CardTitle>
          <div className="flex gap-2">
            {rooms.length > 0 && (
              <Button 
                onClick={() => setShowTileSelection(true)}
                variant="default"
                size="sm"
              >
                Select Tiles & Create Quote
              </Button>
            )}
            <Button 
              onClick={() => setIsDialogOpen(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No rooms added yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Room
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div key={room.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getRoomIcon(room.room_type)}
                    <h3 className="font-semibold text-gray-800">{room.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRoom(room)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoom(room.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{getRoomTypeLabel(room.room_type)}</p>
                  <p>{getRoomDimensions(room)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <RoomFormDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          customerId={customer.id}
          room={editingRoom}
        />
      </CardContent>
    </Card>
  );
};
