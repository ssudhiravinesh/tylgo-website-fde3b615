
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Calendar } from "lucide-react";
import { useRooms } from "@/hooks/useRooms";

interface RoomListProps {
  onAddRoom: () => void;
}

export const RoomList = ({ onAddRoom }: RoomListProps) => {
  const { data: rooms = [], isLoading } = useRooms();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rooms</h1>
          <p className="text-gray-600">Manage room information for quotations</p>
        </div>
        
        <Button 
          onClick={onAddRoom}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add New Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No rooms found</h3>
          <p className="text-gray-500 mb-4">Create your first room to get started</p>
          <Button 
            onClick={onAddRoom}
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
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Home className="h-5 w-5 text-blue-600" />
                  {room.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Created: {new Date(room.created_at).toLocaleDateString()}
                </div>
                
                <Badge variant="outline" className="w-fit">
                  Room ID: {room.id.slice(0, 8)}...
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
