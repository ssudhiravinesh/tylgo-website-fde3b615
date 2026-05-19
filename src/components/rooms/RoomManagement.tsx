import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridLoader } from "@/components/ui/GridLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Calendar, Edit, Trash2, Calculator } from "lucide-react";
import { useRoomsByCustomer, useDeleteRoom } from "@/hooks/useRooms";
import { RoomFormDialog } from "./RoomFormDialog";
import { RoomDimensions } from "./RoomDimensions";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";

interface RoomManagementProps {
  customerId?: string;
}

export const RoomManagement = ({ customerId = "" }: RoomManagementProps) => {
  const { data: rooms = [], isLoading } = useRoomsByCustomer(customerId);
  const deleteRoomMutation = useDeleteRoom();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

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

  const calculateFloorArea = (room: Room) => {
    if (!room.has_floor) return 0;
    return room.length * room.width;
  };

  const calculateWallArea = (room: Room) => {
    if (!room.has_wall) return 0;
    return (room.wall_height || 0) * (room.wall_length || 0);
  };





  if (isLoading) {
    return <GridLoader loadingText="Loading..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Management</h1>
          <p className="text-muted-foreground">Manage room details for your projects</p>
        </div>

        <Button
          onClick={() => setIsFormOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 text-white"
          disabled={!customerId}
        >
          <Plus className="h-4 w-4" />
          Add New Room
        </Button>
      </div>

      {!customerId ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No customer selected</h3>
          <p className="text-muted-foreground">Please select a customer to manage their rooms</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No rooms found</h3>
          <p className="text-muted-foreground mb-4">Create your first room to get started</p>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Room
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id} className="content-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg min-w-0 flex-1">
                    <span className="truncate" title={room.name}>{room.name}</span>
                  </CardTitle>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(room)}
                      className="h-8 w-8 p-0 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary rounded-md"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(room.id, room.name)}
                      className="h-8 w-8 p-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Created: {new Date(room.created_at).toLocaleDateString()}
                </div>

                <Badge variant="outline" className="w-fit mb-2">
                  Room ID: {room.id.slice(0, 8)}...
                </Badge>

                {/* Dimensions Display */}
                <RoomDimensions room={room} variant="detailed" />

                <div className="pt-2 border-t border-border mt-2 space-y-1">
                  {room.has_floor && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Calculator className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">Floor Area:</span>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary/25 bg-primary/8">
                        {calculateFloorArea(room).toFixed(2)} {room.unit}²
                      </Badge>
                    </div>
                  )}
                  {room.has_wall && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Calculator className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">Wall Area:</span>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary/25 bg-primary/8">
                        {calculateWallArea(room).toFixed(2)} {room.unit}²
                      </Badge>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoomFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        room={editingRoom}
        customerId={customerId}
      />
    </div>
  );
};
