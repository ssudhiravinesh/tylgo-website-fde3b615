
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeetInchInput } from "@/components/ui/feet-inch-input";
import { useCreateRoom, useUpdateRoom } from "@/hooks/useRooms";
import { toast } from "sonner";
import type { Room } from "@/hooks/useRooms";

const DEFAULT_ROOM_OPTIONS = [
  "HALL FLOOR",
  "HALL WALL", 
  "BATHROOM FLOOR",
  "BATHROOM WALL",
  "KITCHEN WALL",
  "KITCHEN FLOOR",
  "BEDROOM WALL",
  "BEDROOM FLOOR",
  "STORE WALL",
  "STORE FLOOR",
  "GARAGE WALL", 
  "GARAGE FLOOR",
  "LIVING ROOM WALL",
  "LIVING ROOM FLOOR",
  "DINING ROOM FLOOR",
  "DINING ROOM WALL",
  "TOILET FLOOR",
  "TOILET WALL",
  "BALCONY FLOOR",
  "BALCONY WALL"
];

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
    unit: "metre" as "metre" | "inches" | "mm" | "feet",
    room_type: "floor" as "floor" | "wall",
    wall_height: "",
    wall_length: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        length: room.length.toString(),
        width: room.width.toString(),
        unit: room.unit,
        room_type: room.room_type,
        wall_height: room.wall_height?.toString() || "",
        wall_length: room.wall_length?.toString() || ""
      });
    } else {
      setFormData({
        name: "",
        length: "",
        width: "",
        unit: "metre",
        room_type: "floor",
        wall_height: "",
        wall_length: ""
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

    let length = 0;
    let width = 0;
    let wall_height = 0;
    let wall_length = 0;

    if (formData.room_type === "floor") {
      length = parseFloat(formData.length);
      width = parseFloat(formData.width);
      
      if (isNaN(length) || length <= 0) {
        toast.error("Please enter a valid length");
        return;
      }
      if (isNaN(width) || width <= 0) {
        toast.error("Please enter a valid width");
        return;
      }
    } else {
      // For wall rooms, we use wall_height and wall_length
      wall_height = parseFloat(formData.wall_height);
      wall_length = parseFloat(formData.wall_length);
      
      if (isNaN(wall_height) || wall_height <= 0) {
        toast.error("Please enter a valid wall height");
        return;
      }
      if (isNaN(wall_length) || wall_length <= 0) {
        toast.error("Please enter a valid wall length");
        return;
      }
      
      // For wall rooms, set length to wall_length and width to 0
      length = wall_length;
      width = 0;
    }

    setIsLoading(true);

    try {
      const roomData = {
        name: formData.name.trim(),
        customer_id: customerId,
        length,
        width,
        unit: formData.unit,
        room_type: formData.room_type,
        wall_height: formData.room_type === "wall" ? wall_height : undefined,
        wall_length: formData.room_type === "wall" ? wall_length : undefined,
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
    
    // Handle room name autocomplete
    if (field === "name") {
      const filtered = DEFAULT_ROOM_OPTIONS.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
      setShowSuggestions(value.length > 0 && filtered.length > 0);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, name: suggestion }));
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (formData.name.length > 0) {
      const filtered = DEFAULT_ROOM_OPTIONS.filter(option =>
        option.toLowerCase().includes(formData.name.toLowerCase())
      );
      setFilteredOptions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow for suggestion clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 150);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderDimensionInput = (field: "length" | "width" | "wall_height" | "wall_length", label: string) => {
    if (formData.unit === "feet") {
      return (
        <FeetInchInput
          value={formData[field]}
          onChange={(value) => handleInputChange(field, value)}
          placeholder="20 5"
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
          <div className="space-y-2 relative">
            <Label htmlFor="name">Room Name *</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="e.g., Living Room, Bedroom"
                disabled={isLoading}
                required
                autoComplete="off"
              />
              
              {showSuggestions && filteredOptions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-background border border-border rounded-md shadow-lg"
                >
                  {filteredOptions.map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors focus:bg-accent focus:text-accent-foreground focus:outline-none"
                      onClick={() => handleSuggestionClick(option)}
                      onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-type">Room Type *</Label>
            <Select 
              value={formData.room_type} 
              onValueChange={(value: "floor" | "wall") => handleInputChange("room_type", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floor">Floor Room</SelectItem>
                <SelectItem value="wall">Wall Room</SelectItem>
              </SelectContent>
            </Select>
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

          {formData.room_type === "floor" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="length">
                  Length * {formData.unit === "feet" && <span className="text-xs text-gray-500">(feet inches)</span>}
                </Label>
                {renderDimensionInput("length", "Length")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="width">
                  Width * {formData.unit === "feet" && <span className="text-xs text-gray-500">(feet inches)</span>}
                </Label>
                {renderDimensionInput("width", "Width")}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wall_height">
                  Wall Height * {formData.unit === "feet" && <span className="text-xs text-gray-500">(feet inches)</span>}
                </Label>
                {renderDimensionInput("wall_height", "Height")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wall_length">
                  Wall Length * {formData.unit === "feet" && <span className="text-xs text-gray-500">(feet inches)</span>}
                </Label>
                {renderDimensionInput("wall_length", "Length")}
              </div>
            </div>
          )}

          {formData.room_type === "floor" && formData.length && formData.width && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">
                <p><strong>Floor Area:</strong> {(parseFloat(formData.length || "0") * parseFloat(formData.width || "0")).toFixed(2)} {formData.unit}²</p>
              </div>
            </div>
          )}

          {formData.room_type === "wall" && formData.wall_height && formData.wall_length && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">
                <p><strong>Wall Area:</strong> {(parseFloat(formData.wall_height || "0") * parseFloat(formData.wall_length || "0")).toFixed(2)} {formData.unit}²</p>
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
              disabled={
                isLoading || 
                !formData.name.trim() || 
                (formData.room_type === "floor" && (!formData.length || !formData.width)) ||
                (formData.room_type === "wall" && (!formData.wall_height || !formData.wall_length))
              }
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
