import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, FileText, FileSpreadsheet, Package } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";

interface DownloadCatalogueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: (category?: string) => void;
  onDownloadExcel: (category?: string) => void;
  isGenerating?: boolean;
}

export const DownloadCatalogueDialog = ({ 
  isOpen, 
  onClose, 
  onDownloadPDF, 
  onDownloadExcel,
  isGenerating = false
}: DownloadCatalogueDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const { data: tiles = [] } = useTiles();
  
  // Get unique categories for dropdown
  const categories = Array.from(new Set(tiles.map(tile => tile.category).filter(Boolean)));
  
  // Calculate stats based on selection
  const matchingTiles = selectedCategory && selectedCategory !== "all"
    ? tiles.filter(tile => tile.category?.toLowerCase() === selectedCategory.toLowerCase()) 
    : tiles;

  const handleClose = () => {
    setSelectedCategory("all");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5 text-primary" />
            Download Catalogue
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground/80">
              Select a specific category to download, or leave as "All Categories" to download the complete catalogue.
            </p>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="category">Select Category</Label>
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-medium">
                  All Categories
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-4 rounded-lg flex items-center gap-3 border border-border">
            <div className="bg-card p-2 rounded-full shadow-sm">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Summary</p>
              <p className="text-xs text-muted-foreground">
                {selectedCategory === "all" ? "Entire Catalogue" : selectedCategory} • {matchingTiles.length} Tiles
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
              Cancel
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => onDownloadExcel(selectedCategory === "all" ? undefined : selectedCategory)}
                variant="outline"
                className="flex-1 sm:flex-none gap-2 border-border hover:bg-accent text-foreground"
                disabled={isGenerating}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button 
                onClick={() => onDownloadPDF(selectedCategory === "all" ? undefined : selectedCategory)}
                className="flex-1 sm:flex-none gap-2 bg-primary hover:bg-primary/90"
                disabled={isGenerating}
              >
                <FileText className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'PDF'}
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
