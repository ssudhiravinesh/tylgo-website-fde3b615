import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeetInchInput } from "@/components/ui/feet-inches-input";
import { useCreateRoom, useUpdateRoom } from "@/hooks/useRooms";
import { toast } from "sonner";
import { Plus, Trash2, Ruler, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Room } from "@/hooks/useRooms";

const DEFAULT_ROOM_OPTIONS = [
  "HALL FLOOR", "HALL WALL", 
  "BATHROOM FLOOR", "BATHROOM WALL",
  "KITCHEN WALL", "KITCHEN FLOOR",
  "BEDROOM WALL", "BEDROOM FLOOR",
  "STORE WALL", "STORE FLOOR",
  "GARAGE WALL", "GARAGE FLOOR",
  "LIVING ROOM WALL", "LIVING ROOM FLOOR",
  "DINING ROOM FLOOR", "DINING ROOM WALL",
  "TOILET FLOOR", "TOILET WALL",
  "BALCONY FLOOR", "BALCONY WALL"
];

// Define the shape of a single measurement row
interface MeasurementSet {
  id: number;
  length: string; 
  width: string;  
}

interface RoomFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  room?: Room | null;
  customerId: string;
}

export const RoomFormDialog = ({ isOpen, onClose, room, customerId }: RoomFormDialogProps) => {
  // State for the dynamic list of measurements
  const [measurements, setMeasurements] = useState<MeasurementSet[]>([
    { id: 1, length: "", width: "" }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    unit: "feet" as "metre" | "inches" | "mm" | "feet",
    room_type: "floor" as "floor" | "wall",
  });

  const [isLoading, setIsLoading] = useState(false);
  
  // Autocomplete States
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [dbRoomNames, setDbRoomNames] = useState<string[]>([]);
  const [isFetchingNames, setIsFetchingNames] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();

  // Fetch room names from DB on mount
  useEffect(() => {
    const fetchRoomNames = async () => {
      setIsFetchingNames(true);
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('name')
          .order('name');
        
        if (error) throw error;

        if (data) {
          const uniqueNames = Array.from(new Set(data.map(r => r.name.toUpperCase()))).filter(Boolean);
          setDbRoomNames(uniqueNames);
        }
      } catch (error) {
        console.error('Error fetching room names:', error);
      } finally {
        setIsFetchingNames(false);
      }
    };

    fetchRoomNames();
  }, []);

  // Combine Default + DB options
  const getAllOptions = () => {
    return Array.from(new Set([...DEFAULT_ROOM_OPTIONS, ...dbRoomNames])).sort();
  };

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        unit: room.unit,
        room_type: room.room_type,
      });
      
      // PERSISTENCE LOGIC:
      // 1. Try to load from the new 'measurements' JSON column
      if (room.measurements && Array.isArray(room.measurements) && room.measurements.length > 0) {
        setMeasurements(room.measurements);
      } 
      // 2. Fallback for legacy data: Load from the single length/width columns
      else {
        const legacyLength = room.room_type === "wall" ? room.wall_length : room.length;
        const legacyWidth = room.room_type === "wall" ? room.wall_height : room.width;
        
        setMeasurements([{ 
           id: 1, 
           length: legacyLength?.toString() || "", 
           width: legacyWidth?.toString() || "" 
        }]);
      }
    } else {
      // Reset for new room
      setFormData({
        name: "",
        unit: "feet",
        room_type: "floor",
      });
      setMeasurements([{ id: Date.now(), length: "", width: "" }]);
    }
  }, [room, isOpen]);

  // --- Dynamic Measurement Handlers ---

  const addMeasurementSet = () => {
    setMeasurements(prev => [
      ...prev, 
      { id: Date.now(), length: "", width: "" } // Unique ID
    ]);
  };

  const removeMeasurementSet = (id: number) => {
    if (measurements.length === 1) return; 
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  const updateMeasurement = (id: number, field: 'length' | 'width', value: string) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // --- Area Calculation Helper ---
  const calculateTotalArea = () => {
    let totalArea = 0;
    measurements.forEach(m => {
      const l = parseFloat(m.length) || 0;
      const w = parseFloat(m.width) || 0;
      totalArea += (l * w);
    });
    return totalArea;
  };

  // --- Submission Handler ---
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

    // Validate all inputs
    for (const m of measurements) {
      const l = parseFloat(m.length);
      const w = parseFloat(m.width);
      if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0) {
        toast.error("All dimensions must be valid numbers greater than 0");
        return;
      }
    }

    setIsLoading(true);

    try {
      const totalArea = calculateTotalArea();
      
      const finalLength = totalArea; 
      const finalWidth = 1; 

      const roomData = {
        name: formData.name.trim().toUpperCase(),
        customer_id: customerId,
        // For Tile Calculation Logic (Aggregated)
        length: formData.room_type === "floor" ? finalLength : 0,
        width: formData.room_type === "floor" ? finalWidth : 0,
        wall_length: formData.room_type === "wall" ? finalLength : undefined,
        wall_height: formData.room_type === "wall" ? finalWidth : undefined,
        // For UI Persistence (Detailed)
        measurements: measurements, 
        unit: formData.unit,
        room_type: formData.room_type,
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

  // --- Autocomplete Logic ---
  const handleInputChange = (field: string, value: string) => {
    const processedValue = field === "name" ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    if (field === "name") {
      const allOptions = getAllOptions();
      const filtered = allOptions.filter(option =>
        option.includes(processedValue)
      );
      setFilteredOptions(filtered);
      setShowSuggestions(processedValue.length > 0 && filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    const roomType = suggestion.toLowerCase().includes('wall') ? 'wall' : 
                    suggestion.toLowerCase().includes('floor') ? 'floor' : 
                    formData.room_type;
    
    setFormData(prev => ({ ...prev, name: suggestion, room_type: roomType }));
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Event Handlers for autocomplete
  const handleInputFocus = () => {
    if (formData.name.length > 0) {
      const allOptions = getAllOptions();
      const filtered = allOptions.filter(option =>
        option.includes(formData.name)
      );
      setFilteredOptions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredOptions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) handleSuggestionClick(filteredOptions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputBlur = () => { setTimeout(() => setShowSuggestions(false), 150); };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // --- UI Renderers ---

  const renderMeasurementSets = () => {
    const labelL = formData.room_type === 'wall' ? 'Wall Length' : 'Length';
    const labelW = formData.room_type === 'wall' ? 'Wall Height' : 'Width';

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
           <Label>Dimensions</Label>
           <span className="text-xs text-gray-500">
             {formData.unit === "feet" ? "(feet inches)" : `(${formData.unit})`}
           </span>
        </div>
        
        {measurements.map((m, index) => (
          <div key={m.id} className="flex items-end gap-2 bg-gray-50 p-2 rounded-md border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex-1 space-y-1">
              <span className="text-xs font-medium text-gray-500">
                {index + 1}. {labelL}
              </span>
              {formData.unit === "feet" ? (
                <FeetInchInput
                  value={m.length}
                  onChange={(val) => updateMeasurement(m.id, 'length', val)}
                  placeholder="10 0"
                  disabled={isLoading}
                />
              ) : (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={m.length}
                  onChange={(e) => updateMeasurement(m.id, 'length', e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-xs font-medium text-gray-500">
                {index + 1}. {labelW}
              </span>
              {formData.unit === "feet" ? (
                <FeetInchInput
                  value={m.width}
                  onChange={(val) => updateMeasurement(m.id, 'width', val)}
                  placeholder="10 0"
                  disabled={isLoading}
                />
              ) : (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={m.width}
                  onChange={(e) => updateMeasurement(m.id, 'width', e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              )}
            </div>

            {/* Only show delete button if there is more than 1 measurement */}
            {measurements.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 shrink-0"
                onClick={() => removeMeasurementSet(m.id)}
                title="Remove shape"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMeasurementSet}
          className="w-full gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          Add Another Shape
        </Button>
      </div>
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
          {/* Room Name Input */}
          <div className="space-y-2 relative">
            <Label htmlFor="name">Room Name *</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="name"
                type="text"
                autoComplete="off"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="e.g., LIVING ROOM"
                disabled={isLoading}
                required
              />
              
              {isFetchingNames && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
              
              {showSuggestions && filteredOptions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-background border border-border rounded-md shadow-lg"
                >
                  {filteredOptions.map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm transition-colors focus:outline-none ${
                        index === selectedSuggestionIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => handleSuggestionClick(option)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Room Type Select */}
          <div className="space-y-2">
            <Label htmlFor="room-type">Room Type *</Label>
            <Select 
              value={formData.room_type} 
              onValueChange={(value: "floor" | "wall") => setFormData(prev => ({ ...prev, room_type: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floor">FLOOR ROOM</SelectItem>
                <SelectItem value="wall">WALL ROOM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unit Select */}
          <div className="space-y-2">
            <Label htmlFor="unit">Measurement Unit *</Label>
            <Select 
              value={formData.unit} 
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, unit: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feet">Feet</SelectItem>
                <SelectItem value="metre">Metres</SelectItem>
                <SelectItem value="inches">Inches</SelectItem>
                <SelectItem value="mm">Millimeters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Measurement Sets */}
          {renderMeasurementSets()}

          {/* Total Area Display */}
          <div className={`p-3 rounded-lg border ${formData.room_type === 'floor' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Total Calculated Area:
              </span>
              <span className="font-bold text-lg">
                {calculateTotalArea().toFixed(2)} {formData.unit}²
              </span>
            </div>
            {measurements.length > 1 && (
              <p className="text-xs mt-1 opacity-80">
                Calculated from {measurements.length} shape segments
              </p>
            )}
          </div>

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
              disabled={isLoading || !formData.name.trim() || calculateTotalArea() <= 0}
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
