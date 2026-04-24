import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useCreateStaircase, useUpdateStaircase } from "@/hooks/useStaircases";
import { toast } from "sonner";
import { Loader2, Footprints, Ruler, Calculator } from "lucide-react";
import type { Staircase, StaircaseUnit } from "@/hooks/useStaircases";

interface StaircaseFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staircase?: Staircase | null;
  customerId: string;
}

// Conversion factors to square feet
const UNIT_TO_SQFT: Record<StaircaseUnit, number> = {
  mm: 0.00328084 * 0.00328084,
  inches: (1 / 12) * (1 / 12),
  feet: 1,
  metre: 3.28084 * 3.28084,
};

const UNIT_LABELS: Record<StaircaseUnit, string> = {
  mm: 'Millimeters (mm)',
  inches: 'Inches (in)',
  feet: 'Feet (ft)',
  metre: 'Meters (m)',
};

export const StaircaseFormDialog = ({ isOpen, onClose, staircase, customerId }: StaircaseFormDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    number_of_steps: "",
    number_of_risers: "",
    step_length: "",
    step_width: "",
    riser_height: "",
    riser_width: "",
    unit: "mm" as StaircaseUnit,
  });
  const [wastagePercentage, setWastagePercentage] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const createStaircaseMutation = useCreateStaircase();
  const updateStaircaseMutation = useUpdateStaircase();

  useEffect(() => {
    if (staircase) {
      setFormData({
        name: staircase.name,
        number_of_steps: staircase.number_of_steps.toString(),
        number_of_risers: staircase.number_of_risers.toString(),
        step_length: staircase.step_length?.toString() || "",
        step_width: staircase.step_width?.toString() || "",
        riser_height: staircase.riser_height?.toString() || "",
        riser_width: staircase.riser_width?.toString() || "",
        unit: staircase.unit || "mm",
      });
    } else {
      setFormData({
        name: "",
        number_of_steps: "",
        number_of_risers: "",
        step_length: "",
        step_width: "",
        riser_height: "",
        riser_width: "",
        unit: "mm",
      });
      setWastagePercentage(5);
    }
  }, [staircase, isOpen]);

  // Calculate areas in square feet
  const calculations = useMemo(() => {
    const steps = parseInt(formData.number_of_steps) || 0;
    const risers = parseInt(formData.number_of_risers) || 0;
    const stepLength = parseFloat(formData.step_length) || 0;
    const stepWidth = parseFloat(formData.step_width) || 0;
    const riserHeight = parseFloat(formData.riser_height) || 0;
    const riserWidth = parseFloat(formData.riser_width) || 0;
    const conversionFactor = UNIT_TO_SQFT[formData.unit];

    const stepAreaSqFt = stepLength * stepWidth * steps * conversionFactor;
    const riserAreaSqFt = riserHeight * riserWidth * risers * conversionFactor;
    const totalAreaSqFt = stepAreaSqFt + riserAreaSqFt;
    const totalWithWastage = totalAreaSqFt * (1 + wastagePercentage / 100);

    return {
      steps,
      risers,
      stepAreaSqFt,
      riserAreaSqFt,
      totalAreaSqFt,
      totalWithWastage,
      hasDimensions: stepLength > 0 && stepWidth > 0 && riserHeight > 0 && riserWidth > 0,
    };
  }, [formData, wastagePercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Staircase name is required");
      return;
    }

    if (!customerId) {
      toast.error("Please select a customer first");
      return;
    }

    const steps = parseInt(formData.number_of_steps);
    const risers = parseInt(formData.number_of_risers);

    if (isNaN(steps) || steps <= 0) {
      toast.error("Number of steps must be a valid positive number");
      return;
    }

    if (isNaN(risers) || risers <= 0) {
      toast.error("Number of risers must be a valid positive number");
      return;
    }

    setIsLoading(true);

    try {
      const staircaseData = {
        name: formData.name.trim().toUpperCase(),
        customer_id: customerId,
        number_of_steps: steps,
        number_of_risers: risers,
        step_length: formData.step_length ? parseFloat(formData.step_length) : undefined,
        step_width: formData.step_width ? parseFloat(formData.step_width) : undefined,
        riser_height: formData.riser_height ? parseFloat(formData.riser_height) : undefined,
        riser_width: formData.riser_width ? parseFloat(formData.riser_width) : undefined,
        unit: formData.unit,
      };

      if (staircase) {
        await updateStaircaseMutation.mutateAsync({
          id: staircase.id,
          ...staircaseData,
        });
        toast.success("Staircase updated successfully!");
      } else {
        await createStaircaseMutation.mutateAsync(staircaseData);
        toast.success("Staircase created successfully!");
      }

      onClose();
    } catch (error: unknown) {
      console.error("Error saving staircase:", error);
      toast.error("Failed to save staircase");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-primary" />
            {staircase ? "Edit Staircase" : "Add Staircase"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staircase Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Staircase Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
              placeholder="e.g., MAIN STAIRCASE"
              disabled={isLoading}
              required
            />
          </div>

          {/* Unit Selector */}
          <div className="space-y-2">
            <Label htmlFor="unit">Measurement Unit</Label>
            <Select
              value={formData.unit}
              onValueChange={(value: StaircaseUnit) => setFormData(prev => ({ ...prev, unit: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UNIT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Steps Section */}
          <div className="space-y-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Ruler className="h-4 w-4" />
              <span>Step Dimensions</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="steps" className="text-xs">Count *</Label>
                <Input
                  id="steps"
                  type="number"
                  min="1"
                  value={formData.number_of_steps}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_steps: e.target.value }))}
                  placeholder="12"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="step_length" className="text-xs">Length ({formData.unit})</Label>
                <Input
                  id="step_length"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.step_length}
                  onChange={(e) => setFormData(prev => ({ ...prev, step_length: e.target.value }))}
                  placeholder="900"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="step_width" className="text-xs">Width ({formData.unit})</Label>
                <Input
                  id="step_width"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.step_width}
                  onChange={(e) => setFormData(prev => ({ ...prev, step_width: e.target.value }))}
                  placeholder="300"
                  disabled={isLoading}
                />
              </div>
            </div>
            {calculations.stepAreaSqFt > 0 && (
              <p className="text-xs text-primary">
                Total Step Area: <span className="font-semibold">{calculations.stepAreaSqFt.toFixed(2)} sq ft</span>
              </p>
            )}
          </div>

          {/* Risers Section */}
          <div className="space-y-3 p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Ruler className="h-4 w-4" />
              <span>Riser Dimensions</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="risers" className="text-xs">Count *</Label>
                <Input
                  id="risers"
                  type="number"
                  min="1"
                  value={formData.number_of_risers}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_risers: e.target.value }))}
                  placeholder="12"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="riser_height" className="text-xs">Height ({formData.unit})</Label>
                <Input
                  id="riser_height"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.riser_height}
                  onChange={(e) => setFormData(prev => ({ ...prev, riser_height: e.target.value }))}
                  placeholder="150"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="riser_width" className="text-xs">Width ({formData.unit})</Label>
                <Input
                  id="riser_width"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.riser_width}
                  onChange={(e) => setFormData(prev => ({ ...prev, riser_width: e.target.value }))}
                  placeholder="900"
                  disabled={isLoading}
                />
              </div>
            </div>
            {calculations.riserAreaSqFt > 0 && (
              <p className="text-xs text-muted-foreground">
                Total Riser Area: <span className="font-semibold">{calculations.riserAreaSqFt.toFixed(2)} sq ft</span>
              </p>
            )}
          </div>

          {/* Wastage Slider */}
          <div className="space-y-3 p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Wastage Percentage</Label>
              <span className="text-sm font-bold text-primary">{wastagePercentage}%</span>
            </div>
            <Slider
              value={[wastagePercentage]}
              onValueChange={(value) => setWastagePercentage(value[0])}
              min={0}
              max={15}
              step={1}
              className="w-full"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Add extra tiles to account for cutting and fitting waste
            </p>
          </div>

          {/* Area Calculation Preview */}
          {calculations.hasDimensions && calculations.totalAreaSqFt > 0 && (
            <div className="p-3 bg-primary/8 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                <Calculator className="h-4 w-4" />
                <span>Area Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-card rounded p-2 text-center">
                  <p className="text-lg font-bold text-primary">{calculations.stepAreaSqFt.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Step Area (sq ft)</p>
                </div>
                <div className="bg-card rounded p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{calculations.riserAreaSqFt.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Riser Area (sq ft)</p>
                </div>
                <div className="bg-card rounded p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{calculations.totalAreaSqFt.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Area (sq ft)</p>
                </div>
                <div className="bg-card rounded p-2 text-center">
                  <p className="text-lg font-bold text-primary">{calculations.totalWithWastage.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">With Wastage (sq ft)</p>
                </div>
              </div>
            </div>
          )}

          {/* Fallback: Count-based preview when no dimensions */}
          {!calculations.hasDimensions && (calculations.steps > 0 || calculations.risers > 0) && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground font-medium mb-2">
                Tile Count Preview <span className="text-xs font-normal">(add dimensions for area-based calculation)</span>
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-card rounded p-2">
                  <p className="text-lg font-bold text-primary">{calculations.steps}</p>
                  <p className="text-xs text-muted-foreground">Steps</p>
                </div>
                <div className="bg-card rounded p-2">
                  <p className="text-lg font-bold text-foreground">{calculations.risers}</p>
                  <p className="text-xs text-muted-foreground">Risers</p>
                </div>
                <div className="bg-card rounded p-2">
                  <p className="text-lg font-bold text-primary">{calculations.steps + calculations.risers}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {staircase ? "Update" : "Add"} Staircase
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
