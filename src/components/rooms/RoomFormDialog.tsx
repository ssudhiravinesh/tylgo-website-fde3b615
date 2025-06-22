
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Home, Save, X } from "lucide-react";
import { useCreateRoom, useUpdateRoom, type Room } from "@/hooks/useRooms";
import { useCustomers } from "@/hooks/useCustomers";
import { toast } from "sonner";

interface RoomFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  room?: Room | null;
}

export const RoomFormDialog = ({ isOpen, onClose, room }: RoomFormDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    customer_id: "",
    unit: "metre" as "metre" | "inches" | "mm",
    length: "",
    width: "",
    height: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const { data: customers = [] } = useCustomers();

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        customer_id: room.customer_id || "",
        unit: room.unit || "metre",
        length: room.length?.toString() || "",
        width: room.width?.toString() || "",
        height: room.height?.toString() || "",
      });
    } else {
      setFormData({
        name: "",
        customer_id: "",
        unit: "metre",
        length: "",
        width: "",
        height: "",
      });
    }
  }, [room, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const roomData = {
        name: formData.name.trim(),
        customer_id: formData.customer_id || undefined,
        unit: formData.unit,
        length: formData.length ? parseFloat(formData.length) : undefined,
        width: formData.width ? parseFloat(formData.width) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
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
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error("A room with this name already exists for the selected customer");
      } else {
        toast.error("Failed to save room");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            {room ? "Edit Room" : "Add New Room"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Room Name *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Living Room, Kitchen, Bedroom"
                className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer" className="text-sm font-medium text-gray-700">
                Customer
              </Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              >
                <SelectTrigger className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select a customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium text-gray-700">Room Dimensions</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-xs text-gray-600">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value: "metre" | "inches" | "mm") => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metre">Metres</SelectItem>
                    <SelectItem value="inches">Inches</SelectItem>
                    <SelectItem value="mm">Millimetres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="length" className="text-xs text-gray-600">Length</Label>
                <Input
                  id="length"
                  type="number"
                  step="0.01"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  placeholder="0.00"
                  className="h-10 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="width" className="text-xs text-gray-600">Width</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.01"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  placeholder="0.00"
                  className="h-10 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height" className="text-xs text-gray-600">Height (optional)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="0.00"
                  className="h-10 border-gray-200"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving..." : (room ? "Update Room" : "Create Room")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
