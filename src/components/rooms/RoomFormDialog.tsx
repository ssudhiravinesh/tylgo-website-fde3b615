import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FeetInchInput } from "@/components/ui/feet-inches-input";
import { useCreateRoom, useUpdateRoom } from "@/hooks/useRooms";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/errorUtils";
import { Plus, Trash2, Ruler, Loader2, Layers, PenTool } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Room } from "@/hooks/useRooms";
import type { CanvasRoomShape } from "@/types/canvas.types";
import { CanvasGrid } from "./CanvasGrid";
import { calculateCanvasArea, calculateCanvasPerimeter, validateShape } from "@/utils/canvasShapeEngine";

// Room name suggestions — no more FLOOR/WALL suffixes
const DEFAULT_ROOM_OPTIONS = [
  "HALL",
  "BATHROOM",
  "KITCHEN",
  "BEDROOM",
  "STORE",
  "GARAGE",
  "LIVING ROOM",
  "DINING ROOM",
  "TOILET",
  "BALCONY",
  "GUEST ROOM",
  "STUDY ROOM",
  "POOJA ROOM",
  "LOBBY",
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
  // State for floor measurements
  const [floorMeasurements, setFloorMeasurements] = useState<MeasurementSet[]>([
    { id: 1, length: "", width: "" }
  ]);

  // State for wall measurements
  const [wallMeasurements, setWallMeasurements] = useState<MeasurementSet[]>([
    { id: 1, length: "", width: "" }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    unit: "feet" as "metre" | "inches" | "mm" | "feet",
    has_floor: true,
    has_wall: false,
  });

  // Canvas mode state
  const [inputMode, setInputMode] = useState<'manual' | 'canvas'>('manual');
  const [canvasShape, setCanvasShape] = useState<CanvasRoomShape | null>(null);

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

  // Initialize form state when dialog opens or room changes
  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        unit: room.unit,
        has_floor: room.has_floor,
        has_wall: room.has_wall,
      });

      // Detect canvas-mode room and restore canvas state
      if (room.canvas_cells && Array.isArray(room.canvas_cells) && room.canvas_cells.length > 0) {
        setInputMode('canvas');
        setCanvasShape({
          cells: room.canvas_cells,
          edges: room.canvas_edges ?? [],
          unitRatio: room.canvas_unit_ratio ?? null,
          height: room.wall_height ?? null,
          unit: room.unit,
        });
      } else {
        setInputMode('manual');
        setCanvasShape(null);
      }
      
      // Load floor measurements
      if (room.has_floor) {
        if (room.measurements && Array.isArray(room.measurements) && room.measurements.length > 0) {
          setFloorMeasurements(room.measurements);
        } else if (room.length > 0) {
          setFloorMeasurements([{ 
            id: 1, 
            length: room.length.toString(), 
            width: room.width.toString() 
          }]);
        } else {
          setFloorMeasurements([{ id: Date.now(), length: "", width: "" }]);
        }
      }

      // Load wall measurements
      if (room.has_wall) {
        if (room.wall_measurements && Array.isArray(room.wall_measurements) && room.wall_measurements.length > 0) {
          setWallMeasurements(room.wall_measurements);
        } else if (room.wall_length && room.wall_height) {
          setWallMeasurements([{ 
            id: 1, 
            length: room.wall_length.toString(), 
            width: room.wall_height.toString() 
          }]);
        } else {
          setWallMeasurements([{ id: Date.now(), length: "", width: "" }]);
        }
      }
    } else {
      // Reset for new room
      setFormData({
        name: "",
        unit: "feet",
        has_floor: true,
        has_wall: false,
      });
      setInputMode('manual');
      setCanvasShape(null);
      setFloorMeasurements([{ id: Date.now(), length: "", width: "" }]);
      setWallMeasurements([{ id: Date.now() + 1, length: "", width: "" }]);
    }
  }, [room, isOpen]);

  // --- Dynamic Measurement Handlers ---

  const addMeasurementSet = (type: 'floor' | 'wall') => {
    const setter = type === 'floor' ? setFloorMeasurements : setWallMeasurements;
    setter(prev => [
      ...prev, 
      { id: Date.now(), length: "", width: "" }
    ]);
  };

  const removeMeasurementSet = (type: 'floor' | 'wall', id: number) => {
    const setter = type === 'floor' ? setFloorMeasurements : setWallMeasurements;
    const measurements = type === 'floor' ? floorMeasurements : wallMeasurements;
    if (measurements.length === 1) return; 
    setter(prev => prev.filter(m => m.id !== id));
  };

  const updateMeasurement = (type: 'floor' | 'wall', id: number, field: 'length' | 'width', value: string) => {
    const setter = type === 'floor' ? setFloorMeasurements : setWallMeasurements;
    setter(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // --- Area Calculation Helpers ---
  const calculateTotalArea = (measurements: MeasurementSet[]) => {
    let totalArea = 0;
    measurements.forEach(m => {
      const l = parseFloat(m.length) || 0;
      const w = parseFloat(m.width) || 0;
      totalArea += (l * w);
    });
    return totalArea;
  };

  const floorArea = formData.has_floor ? calculateTotalArea(floorMeasurements) : 0;
  const wallArea = formData.has_wall ? calculateTotalArea(wallMeasurements) : 0;

  // --- Validation ---
  const validateMeasurements = (measurements: MeasurementSet[], label: string): boolean => {
    for (const m of measurements) {
      const l = parseFloat(m.length);
      const w = parseFloat(m.width);
      if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0) {
        toast.error(`All ${label} dimensions must be valid numbers greater than 0`);
        return false;
      }
    }
    return true;
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

    if (!formData.has_floor && !formData.has_wall) {
      toast.error("Please enable at least one surface (Floor or Wall)");
      return;
    }

    // Canvas mode validation
    if (inputMode === 'canvas' && formData.has_floor && canvasShape) {
      const validation = validateShape(canvasShape);
      if (!validation.valid) {
        validation.errors.forEach(err => toast.error(err));
        return;
      }
    }

    // Manual mode validation
    if (inputMode === 'manual') {
      if (formData.has_floor && !validateMeasurements(floorMeasurements, "floor")) return;
    }
    if (formData.has_wall && inputMode === 'manual' && !validateMeasurements(wallMeasurements, "wall")) return;

    setIsLoading(true);

    try {
      let roomData;

      if (inputMode === 'canvas' && canvasShape && formData.has_floor) {
        // Canvas mode: derive backwards-compatible fields from canvas shape
        const canvasArea = calculateCanvasArea(canvasShape);
        const canvasPerimeter = calculateCanvasPerimeter(canvasShape);
        const hasWall = canvasShape.height != null && canvasShape.height > 0;

        roomData = {
          name: formData.name.trim().toUpperCase(),
          customer_id: customerId,
          unit: formData.unit,
          room_type: 'room' as const,
          has_floor: true,
          has_wall: hasWall,
          // Backwards-compatible: existing tile calculators use length × width
          length: canvasArea,
          width: 1,
          measurements: undefined as undefined,
          // Wall dimensions from canvas perimeter + height
          wall_length: hasWall ? canvasPerimeter : undefined as number | undefined,
          wall_height: hasWall ? canvasShape.height! : undefined as number | undefined,
          wall_measurements: undefined as undefined,
          // Canvas-specific columns
          canvas_cells: canvasShape.cells,
          canvas_edges: canvasShape.edges,
          canvas_unit_ratio: canvasShape.unitRatio ?? undefined,
        };
      } else {
        // Manual mode: existing logic
        roomData = {
          name: formData.name.trim().toUpperCase(),
          customer_id: customerId,
          unit: formData.unit,
          room_type: 'room' as const,
          has_floor: formData.has_floor,
          has_wall: formData.has_wall,
          // Floor dimensions (aggregated total area as length, width=1)
          length: formData.has_floor ? floorArea : 0,
          width: formData.has_floor ? 1 : 0,
          measurements: formData.has_floor ? floorMeasurements : undefined,
          // Wall dimensions: wall_length = perimeter, wall_height = actual height
          // NOT aggregated area — the layer calculator needs real height for row count
          wall_length: formData.has_wall ? parseFloat(wallMeasurements[0]?.length || '0') : undefined,
          wall_height: formData.has_wall ? parseFloat(wallMeasurements[0]?.width || '0') : undefined,
          wall_measurements: formData.has_wall ? wallMeasurements : undefined,
          // Clear canvas columns when switching to manual
          canvas_cells: undefined as undefined,
          canvas_edges: undefined as undefined,
          canvas_unit_ratio: undefined as undefined,
        };
      }

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
    } catch (error: unknown) {
      console.error("Error saving room:", error);
      const msg = getErrorMessage(error, 'Failed to save room');
      if (msg.includes('duplicate') || (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505')) {
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
    setFormData(prev => ({ ...prev, name: suggestion }));
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

  const renderMeasurementSection = (
    type: 'floor' | 'wall',
    measurements: MeasurementSet[],
    labelL: string,
    labelW: string,
    singleShapeOnly: boolean = false,
  ) => {
    return (
      <div className="space-y-3">
        {measurements.map((m, index) => (
          <div key={m.id} className="flex items-end gap-2 bg-muted p-2 rounded-md border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex-1 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {singleShapeOnly ? labelL : `${index + 1}. ${labelL}`}
              </span>
              {formData.unit === "feet" ? (
                <FeetInchInput
                  value={m.length}
                  onChange={(val) => updateMeasurement(type, m.id, 'length', val)}
                  placeholder="10 0"
                  disabled={isLoading}
                />
              ) : (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={m.length}
                  onChange={(e) => updateMeasurement(type, m.id, 'length', e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {singleShapeOnly ? labelW : `${index + 1}. ${labelW}`}
              </span>
              {formData.unit === "feet" ? (
                <FeetInchInput
                  value={m.width}
                  onChange={(val) => updateMeasurement(type, m.id, 'width', val)}
                  placeholder="10 0"
                  disabled={isLoading}
                />
              ) : (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={m.width}
                  onChange={(e) => updateMeasurement(type, m.id, 'width', e.target.value)}
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
                className="mb-0.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0"
                onClick={() => removeMeasurementSet(type, m.id)}
                title="Remove shape"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {!singleShapeOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addMeasurementSet(type)}
            className="w-full gap-2 text-primary border-primary/20 hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            Add Another Shape
          </Button>
        )}
      </div>
    );
  };

  // Check if form can submit
  const canvasReady = inputMode === 'canvas' && canvasShape
    ? canvasShape.cells.length > 0 && canvasShape.unitRatio !== null
    : false;

  const canSubmit = formData.name.trim().length > 0 &&
    (formData.has_floor || formData.has_wall) &&
    (
      inputMode === 'canvas'
        ? canvasReady
        : (
            (!formData.has_floor || floorArea > 0) &&
            (!formData.has_wall || wallArea > 0)
          )
    );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${inputMode === 'canvas' ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
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
                placeholder="e.g., BATHROOM"
                disabled={isLoading}
                required
              />
              
              {isFetchingNames && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/70" />
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

          {/* Unit Select */}
          <div className="space-y-2">
            <Label htmlFor="unit">Measurement Unit *</Label>
            <Select 
              value={formData.unit} 
              onValueChange={(value: "metre" | "inches" | "mm" | "feet") => setFormData(prev => ({ ...prev, unit: value }))}
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

          {/* ═══ Surface Toggles + Dimensions ═══ */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Room Surfaces</Label>

            {/* --- Floor Surface Section --- */}
            <div className={`rounded-lg border transition-colors ${formData.has_floor ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
              <div className="flex items-center gap-3 p-3">
                <Checkbox
                  id="has_floor"
                  checked={formData.has_floor}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_floor: checked === true }))}
                  disabled={isLoading}
                />
                <Label htmlFor="has_floor" className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                  <Layers className="h-4 w-4 text-primary" />
                  Floor Surface
                </Label>
                {formData.has_floor && inputMode === 'manual' && floorArea > 0 && (
                  <span className="ml-auto text-xs font-medium text-primary">
                    {floorArea.toFixed(2)} {formData.unit}²
                  </span>
                )}
                {formData.has_floor && inputMode === 'canvas' && canvasShape?.unitRatio !== null && canvasShape?.unitRatio !== undefined && (
                  <span className="ml-auto text-xs font-medium text-primary">
                    {calculateCanvasArea(canvasShape).toFixed(2)} {formData.unit}²
                  </span>
                )}
              </div>
              
              {formData.has_floor && (
                <div className="px-3 pb-3 pt-1 border-t border-border/50">
                  {/* Mode Toggle */}
                  <div className="flex gap-1 bg-muted p-1 rounded-lg mb-3">
                    <button
                      type="button"
                      onClick={() => setInputMode('manual')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                        inputMode === 'manual'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Ruler className="h-3 w-3" />
                      Manual Input
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('canvas')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                        inputMode === 'canvas'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <PenTool className="h-3 w-3" />
                      Draw on Grid
                    </button>
                  </div>

                  {inputMode === 'manual' ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-muted-foreground">Floor Dimensions</span>
                        <span className="text-xs text-muted-foreground">
                          {formData.unit === "feet" ? "(feet inches)" : `(${formData.unit})`}
                        </span>
                      </div>
                      {renderMeasurementSection('floor', floorMeasurements, 'Length', 'Width')}
                    </>
                  ) : (
                    <CanvasGrid
                      unit={formData.unit}
                      initialShape={canvasShape ?? undefined}
                      onShapeChange={setCanvasShape}
                      disabled={isLoading}
                    />
                  )}
                </div>
              )}
            </div>

            {/* --- Wall Surface Section (hidden in canvas mode — height is inside canvas) --- */}
            {inputMode === 'manual' && (
              <div className={`rounded-lg border transition-colors ${formData.has_wall ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                <div className="flex items-center gap-3 p-3">
                  <Checkbox
                    id="has_wall"
                    checked={formData.has_wall}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_wall: checked === true }))}
                    disabled={isLoading}
                  />
                  <Label htmlFor="has_wall" className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                    <Layers className="h-4 w-4 text-primary" />
                    Wall Surface
                  </Label>
                  {formData.has_wall && wallArea > 0 && (
                    <span className="ml-auto text-xs font-medium text-primary">
                      {wallArea.toFixed(2)} {formData.unit}²
                    </span>
                  )}
                </div>
                
                {formData.has_wall && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Wall Dimensions</span>
                      <span className="text-xs text-muted-foreground">
                        {formData.unit === "feet" ? "(feet inches)" : `(${formData.unit})`}
                      </span>
                    </div>
                    {renderMeasurementSection('wall', wallMeasurements, 'Wall Perimeter', 'Wall Height', true)}
                  </div>
                )}
              </div>
            )}

            {/* Validation hint */}
            {!formData.has_floor && !formData.has_wall && (
              <p className="text-xs text-destructive font-medium">
                At least one surface must be enabled
              </p>
            )}
          </div>

          {/* Total Area Summary */}
          {(formData.has_floor || formData.has_wall) && (floorArea > 0 || wallArea > 0) && (
            <div className="p-3 rounded-lg border bg-primary/8 border-primary/20 text-foreground">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Ruler className="h-4 w-4" />
                Area Summary
              </div>
              <div className="space-y-1">
                {formData.has_floor && floorArea > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Floor Area:</span>
                    <span className="font-bold">{floorArea.toFixed(2)} {formData.unit}²</span>
                  </div>
                )}
                {formData.has_wall && wallArea > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Wall Area:</span>
                    <span className="font-bold">{wallArea.toFixed(2)} {formData.unit}²</span>
                  </div>
                )}
                {formData.has_floor && formData.has_wall && floorArea > 0 && wallArea > 0 && (
                  <div className="flex justify-between text-sm pt-1 mt-1 border-t border-primary/20">
                    <span className="font-medium">Combined:</span>
                    <span className="font-bold text-primary">{(floorArea + wallArea).toFixed(2)} {formData.unit}²</span>
                  </div>
                )}
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
              disabled={isLoading || !canSubmit}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? "Saving..." : room ? "Update Room" : "Create Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
