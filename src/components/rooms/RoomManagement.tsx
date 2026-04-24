import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridLoader } from "@/components/ui/GridLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Calendar, Edit, Trash2, Layers, Ruler, Calculator } from "lucide-react";
import { useRoomsByCustomer, useDeleteRoom } from "@/hooks/useRooms";
import { RoomFormDialog } from "./RoomFormDialog";
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

  const calculateArea = (room: Room) => {
    if (room.room_type === "wall") {
      return ((room.wall_height || 0) * (room.wall_length || 0)).toFixed(2);
    }
    return (room.length * room.width).toFixed(2);
  };

  // Helper to render dimensions correctly (handling both Multi-Shape and Legacy)
  const renderRoomDimensions = (room: Room) => {
    // 1. Check for Multi-Shape Data
    if (room.measurements && room.measurements.length > 0) {
      return (
        <div className="space-y-2 bg-muted p-3 rounded-md border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-foreground/80 flex items-center gap-1">
              <Layers className="h-4 w-4" />
              Dimensions ({room.measurements.length} Shapes)
            </span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {room.measurements.map((m, idx) => (
              <div key={idx} className="flex justify-between text-sm border-b border-border last:border-0 pb-1.5 last:pb-0 border-dashed">
                <span className="text-muted-foreground font-medium">Shape {idx + 1}:</span>
                {/* FIXED: Applied formatting logic here */}
                <span className="font-semibold text-foreground" style={{ fontFamily: "'Manrope', sans-serif" }}>
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
      <div className="grid grid-cols-2 gap-2 text-sm bg-card p-2 rounded border border-dashed border-border">
        <div className="flex items-center gap-1">
          <Ruler className="h-3 w-3 text-muted-foreground/70" />
          <span className="text-muted-foreground text-xs">{lLabel}:</span>
        </div>
        <span className="font-medium text-right">{l} {room.unit}</span>

        <div className="flex items-center gap-1">
          <Ruler className="h-3 w-3 text-muted-foreground/70" />
          <span className="text-muted-foreground text-xs">{wLabel}:</span>
        </div>
        <span className="font-medium text-right">{w} {room.unit}</span>
      </div>
    );
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Home className="h-5 w-5 text-primary" />
                    {room.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(room)}
                      className="h-8 w-8 p-0 hover:bg-primary/15"
                    >
                      <Edit className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(room.id, room.name)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
                {renderRoomDimensions(room)}

                <div className="pt-2 border-t border-border mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Calculator className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Total Area:</span>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary/25 bg-primary/8">
                      {calculateArea(room)} {room.unit}²
                    </Badge>
                  </div>
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
