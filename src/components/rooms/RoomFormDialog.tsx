import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeetInchesInput } from "@/components/ui/feet-inch-input";
import { useCreateRoom, useUpdateRoom } from "@/hooks/useRooms";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";

interface RoomFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  room?: Room | null;
  customerId: string;
}

export const RoomFormDialog = ({ isOpen, onClose, room, customerId }: RoomFormDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    length: "",
    width: "",
    unit: "metre" as "metre" | "inches" | "mm" | "feet"
  });
  const [isLoading, setIsLoading] = useState(false);

  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        length: room.length.toString(),
        width: room.width.toString(),
        unit: room.unit,
      });
    } else {
      setFormData({
        name: "",
        length: "",
        width: "",
        unit: "metre"
      });
    }
  }, [room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Room name is required");
      return;
    }

    if (!customerId) {
      toast.error("Please select a customer first");
      return;
    }

    const length = parseFloat(formData.length);
    const width = parseFloat(formData.width);

    if (isNaN(length) || length <= 0) {
      toast.error("Please enter a valid length");
      return;
    }

    if (isNaN(width) || width <= 0) {
      toast.error("Please enter a valid width");
      return;
    }

    setIsLoading(true);

    try {
      const roomData = {
        name: formData.name.trim(),
        customer_id: customerId,
        length,
        width,
        unit: formData.unit,
      };

      if (room) {
        await updateRoomMutation.mutateAsync({
          id: room.id,
          ...roomData,
        });
        toast.success("Room updated successfully!");
      } else {
        await createRoomMutation.mutateAsync(roomData);
        toast.success("Room created successfully!");
      }
      
      onClose();
    } catch (error: any) {
      console.error("Error saving room:", error);
      if (error?.message?.includes("duplicate") || error?.code === "23505") {
        toast.error("A room with this name already exists for this customer");
      } else {
        toast.error("Failed to save room");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderDimensionInput = (field: "length" | "width", label: string) => {
    if (formData.unit === "feet") {
      return (
        <FeetInchesInput
          value={formData[field]}
          onChange={(value) => handleInputChange(field, value)}
          placeholder="0' 0\""
          disabled={isLoading}
        />
      );
    }

    return (
      <Input
        type="number"
        step="0.01"
        min="0"
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        placeholder="0.00"
        disabled={isLoading}
        required
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {room ? "Edit Room" : "Add New Room"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Living Room, Bedroom"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Measurement Unit *</Label>
            <Select 
              value={formData.unit} 
              onValueChange={(value: "metre" | "inches" | "mm" | "feet") => handleInputChange("unit", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metre">Metres</SelectItem>
                <SelectItem value="feet">Feet</SelectItem>
                <SelectItem value="inches">Inches</SelectItem>
                <SelectItem value="mm">Millimeters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="length">
                Length * {formData.unit === "feet" && <span className="text-xs text-gray-500">(e.g., 20' 5\")</span>}
              </Label>
              {renderDimensionInput("length", "Length")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">
                Width * {formData.unit === "feet" && <span className="text-xs text-gray-500">(e.g., 15' 8\")</span>}
              </Label>
              {renderDimensionInput("width", "Width")}
            </div>
          </div>

          {formData.length && formData.width && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">
                <p><strong>Floor Area:</strong> {(parseFloat(formData.length || "0") * parseFloat(formData.width || "0")).toFixed(2)} {formData.unit}²</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.length || !formData.width}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Saving..." : room ? "Update Room" : "Create Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
