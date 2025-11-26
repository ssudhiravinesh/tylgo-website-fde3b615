import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                <span className="font-mono text-xs font-medium text-gray-700">
                  {m.length} × {m.width} {room.unit}
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
  
  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Room Management</h1>
          <p className="text-gray-600">Manage room details for your projects</p>
        </div>
        
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!customerId}
        >
          <Plus className="h-4 w-4" />
          Add New Room
        </Button>
      </div>

      {!customerId ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No customer selected</h3>
          <p className="text-gray-500">Please select a customer to manage their rooms</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No rooms found</h3>
          <p className="text-gray-500 mb-4">Create your first room to get started</p>
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
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Created: {new Date(room.created_at).toLocaleDateString()}
                </div>
                
                <Badge variant="outline" className="w-fit mb-2">
                  Room ID: {room.id.slice(0, 8)}...
                </Badge>

                {/* Dimensions Display */}
                {renderRoomDimensions(room)}

                <div className="pt-2 border-t border-gray-100 mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Calculator className="h-3 w-3 text-green-600" />
                      <span className="text-gray-600">Total Area:</span>
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

      <RoomFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        room={editingRoom}
        customerId={customerId}
      />
    </div>
  );
};
