
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Home, Save } from "lucide-react";
import { useCreateRoom } from "@/hooks/useRooms";
import { toast } from "sonner";

interface RoomFormProps {
  onBack: () => void;
}

export const RoomForm = ({ onBack }: RoomFormProps) => {
  const [roomName, setRoomName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createRoomMutation = useCreateRoom();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createRoomMutation.mutateAsync({
        name: roomName.trim()
      });
      
      toast.success("Room created successfully!");
      setRoomName("");
      onBack();
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Add New Room</h1>
          <p className="text-gray-600">Create a new room for quotations</p>
        </div>
      </div>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            Room Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="roomName" className="text-sm font-medium text-gray-700">
                Room Name *
              </Label>
              <Input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g., Living Room, Kitchen, Bedroom"
                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !roomName.trim()}
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
