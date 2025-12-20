import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateStaircase, useUpdateStaircase } from "@/hooks/useStaircases";
import { toast } from "sonner";
import { Loader2, Footprints } from "lucide-react";
import type { Staircase } from "@/hooks/useStaircases";

interface StaircaseFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staircase?: Staircase | null;
  customerId: string;
}

export const StaircaseFormDialog = ({ isOpen, onClose, staircase, customerId }: StaircaseFormDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    number_of_steps: "",
    number_of_risers: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const createStaircaseMutation = useCreateStaircase();
  const updateStaircaseMutation = useUpdateStaircase();

  useEffect(() => {
    if (staircase) {
      setFormData({
        name: staircase.name,
        number_of_steps: staircase.number_of_steps.toString(),
        number_of_risers: staircase.number_of_risers.toString(),
      });
    } else {
      setFormData({
        name: "",
        number_of_steps: "",
        number_of_risers: "",
      });
    }
  }, [staircase, isOpen]);

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
    } catch (error: any) {
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

  // Calculate total tiles needed
  const steps = parseInt(formData.number_of_steps) || 0;
  const risers = parseInt(formData.number_of_risers) || 0;
  const totalTilesNeeded = steps + risers;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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

          {/* Number of Steps */}
          <div className="space-y-2">
            <Label htmlFor="steps">Number of Steps *</Label>
            <Input
              id="steps"
              type="number"
              min="1"
              value={formData.number_of_steps}
              onChange={(e) => setFormData(prev => ({ ...prev, number_of_steps: e.target.value }))}
              placeholder="e.g., 12"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">Each step requires 1 tile</p>
          </div>

          {/* Number of Risers */}
          <div className="space-y-2">
            <Label htmlFor="risers">Number of Risers *</Label>
            <Input
              id="risers"
              type="number"
              min="1"
              value={formData.number_of_risers}
              onChange={(e) => setFormData(prev => ({ ...prev, number_of_risers: e.target.value }))}
              placeholder="e.g., 12"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">Each riser requires 1 tile</p>
          </div>

          {/* Tile Calculation Preview */}
          {totalTilesNeeded > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">Tiles Required:</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <div className="bg-white rounded p-2">
                  <p className="text-lg font-bold text-blue-600">{steps}</p>
                  <p className="text-xs text-gray-500">Step Tiles</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-lg font-bold text-orange-600">{risers}</p>
                  <p className="text-xs text-gray-500">Riser Tiles</p>
                </div>
                <div className="bg-white rounded p-2">
                  <p className="text-lg font-bold text-green-600">{totalTilesNeeded}</p>
                  <p className="text-xs text-gray-500">Total Tiles</p>
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
