import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, IndianRupee } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useUpdateTile } from "@/hooks/useTileManagement";
import { toast } from "sonner";

interface CategoryBulkPriceUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryBulkPriceUpdateDialog = ({ isOpen, onClose }: CategoryBulkPriceUpdateDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [pricePerBox, setPricePerBox] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { data: tiles = [] } = useTiles();
  const updateTileMutation = useUpdateTile(true); // Skip individual toasts during bulk update
  
  // Get unique categories for dropdown
  const categories = Array.from(new Set(tiles.map(tile => tile.category).filter(Boolean)));
  
  // Get all tiles with the selected category
  const matchingTiles = selectedCategory ? tiles.filter(tile => 
    tile.category?.toLowerCase() === selectedCategory.toLowerCase()
  ) : [];

  const handleClose = () => {
    setSelectedCategory("");
    setPricePerBox("");
    setIsConfirming(false);
    setIsUpdating(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }
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
      // Update all tiles with the selected category
      const updatePromises = matchingTiles.map(tile => 
        updateTileMutation.mutateAsync({
          id: tile.id,
          code: tile.code,
          name: tile.name,
          size_length: tile.size_length,
          size_breadth: tile.size_breadth,
          price_per_box: price,
          pieces_per_box: tile.pieces_per_box,
          image_url: tile.image_url,
          category: tile.category
        })
      );
      
      await Promise.all(updatePromises);
      
      toast.success(`Updated price for ${matchingTiles.length} tiles in "${selectedCategory}" category`);
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
              Bulk Price Update by Category
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Select a category and new price to update all tiles in that category at once.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Select Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>{matchingTiles.length} tiles</strong> found in "{selectedCategory}" category
                </p>
                <div className="max-h-20 overflow-y-auto space-y-1">
                  {matchingTiles.slice(0, 5).map((tile) => (
                    <div key={tile.id} className="text-xs text-gray-600">
                      {tile.code} - {tile.name}
                    </div>
                  ))}
                  {matchingTiles.length > 5 && (
                    <div className="text-xs text-gray-500">
                      +{matchingTiles.length - 5} more tiles...
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
                disabled={!selectedCategory}
              />
            </div>
            
            {pricePerBox && parseFloat(pricePerBox) > 0 && selectedCategory && (
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
              disabled={!selectedCategory || !pricePerBox || parseFloat(pricePerBox) <= 0}
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
              in "{selectedCategory}" category to <strong>₹{pricePerBox} per box</strong>.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm text-gray-800 mb-2">Tiles to be updated:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {matchingTiles.map((tile) => (
                <div key={tile.id} className="text-xs text-gray-600 flex justify-between border-b border-gray-200 pb-1">
                  <span>{tile.code} - {tile.name}</span>
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