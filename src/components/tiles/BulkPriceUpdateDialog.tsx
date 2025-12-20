import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, IndianRupee } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useUpdateTile } from "@/hooks/useTileManagement";
import { toast } from "sonner";

interface BulkPriceUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tileName: string;
}

export const BulkPriceUpdateDialog = ({ isOpen, onClose, tileName }: BulkPriceUpdateDialogProps) => {
  const [pricePerBox, setPricePerBox] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: tiles = [] } = useTiles();
  const updateTileMutation = useUpdateTile();

  // Get all tiles with the matching name
  const matchingTiles = tiles.filter(tile =>
    tile.code.toLowerCase() === tileName.toLowerCase()
  );

  const handleClose = () => {
    setPricePerBox("");
    setIsConfirming(false);
    setIsUpdating(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!pricePerBox || parseFloat(pricePerBox) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    setIsConfirming(true);
  };

  const handleUpdate = async () => {
    if (!pricePerBox || matchingTiles.length === 0) return;

    setIsUpdating(true);
    const price = parseFloat(pricePerBox);

    try {
      // Update all tiles with the same name
      const updatePromises = matchingTiles.map(tile =>
        updateTileMutation.mutateAsync({
          id: tile.id,
          code: tile.code,
          name: tile.code,
          size_length: tile.size_length,
          size_breadth: tile.size_breadth,
          price_per_box: price,
          pieces_per_box: tile.pieces_per_box,
          image_url: tile.image_url
        })
      );

      await Promise.all(updatePromises);

      toast.success(`Updated price for ${matchingTiles.length} tiles named "${tileName}"`);
      handleClose();
    } catch (error) {
      console.error("Error updating tile prices:", error);
      toast.error("Failed to update tile prices");
    } finally {
      setIsUpdating(false);
    }
  };

  const calculatePricePerSqFt = (tile: any, newPrice: number) => {
    if (!tile.pieces_per_box || !tile.size_length || !tile.size_breadth) {
      return 0;
    }

    const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
    const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764; // Convert to sq ft
    return newPrice / areaPerBoxSqFt;
  };

  if (!isConfirming) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-green-600" />
              Change Price for "{tileName}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                This will update the price for <strong>{matchingTiles.length} tiles</strong> with the name "{tileName}".
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">New Price per Box (₹)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter new price per box"
                value={pricePerBox}
                onChange={(e) => setPricePerBox(e.target.value)}
                className="h-12"
              />
            </div>

            {pricePerBox && parseFloat(pricePerBox) > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm text-gray-800 mb-2">Preview (Price per sq ft):</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {matchingTiles.slice(0, 3).map((tile) => (
                    <div key={tile.id} className="text-xs text-gray-600 flex justify-between">
                      <span>{tile.code} ({tile.size_length}×{tile.size_breadth}mm)</span>
                      <span>₹{calculatePricePerSqFt(tile, parseFloat(pricePerBox)).toFixed(2)}/sq ft</span>
                    </div>
                  ))}
                  {matchingTiles.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{matchingTiles.length - 3} more tiles...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!pricePerBox || parseFloat(pricePerBox) <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Price Update
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Warning:</strong> This action will update the price for all {matchingTiles.length} tiles
              named "{tileName}" to <strong>₹{pricePerBox} per box</strong>.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm text-gray-800 mb-2">Tiles to be updated:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {matchingTiles.map((tile) => (
                <div key={tile.id} className="text-xs text-gray-600 flex justify-between border-b border-gray-200 pb-1">
                  <span>{tile.code}</span>
                  <span>{tile.size_length}×{tile.size_breadth}mm</span>
                  <span>₹{tile.price_per_box || 0} → ₹{pricePerBox}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-gray-600">
            This action cannot be undone. Are you sure you want to proceed?
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsConfirming(false)} disabled={isUpdating}>
            Back
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isUpdating ? "Updating..." : "Yes, Update All Prices"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};