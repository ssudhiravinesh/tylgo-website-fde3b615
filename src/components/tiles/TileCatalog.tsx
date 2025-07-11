
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, IndianRupee, X, QrCode } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { QRScanner } from "@/components/qr/QRScanner";
import { toast } from "sonner";
import type { Tile } from "@/hooks/useTiles";

interface TileCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onTileSelect: (tileId: string) => void;
  selectedTileIds?: string[];
}

export const TileCatalog = ({ isOpen, onClose, onTileSelect, selectedTileIds = [] }: TileCatalogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const { data: tiles = [], isLoading } = useTiles();

  const filteredTiles = tiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTileSelect = (tileId: string) => {
    onTileSelect(tileId);
    onClose();
  };

  const handleQRScanned = (tileCode: string) => {
    console.log('QR scanned in TileCatalog:', tileCode);
    
    // First, set the search term to filter tiles
    setSearchTerm(tileCode);
    
    // Check if there's an exact match by code
    const exactMatch = tiles.find(t => 
      t.code.toLowerCase() === tileCode.toLowerCase()
    );
    
    if (exactMatch) {
      console.log('Exact match found:', exactMatch.name);
      // Auto-select the exact match
      handleTileSelect(exactMatch.id);
      toast.success(`Tile "${exactMatch.name}" (${exactMatch.code}) selected automatically`, {
        duration: 3000
      });
    } else {
      // Check for partial matches
      const partialMatches = tiles.filter(t => 
        t.code.toLowerCase().includes(tileCode.toLowerCase()) ||
        t.name.toLowerCase().includes(tileCode.toLowerCase())
      );
      
      if (partialMatches.length === 1) {
        // If only one partial match, auto-select it
        console.log('Single partial match found:', partialMatches[0].name);
        handleTileSelect(partialMatches[0].id);
        toast.success(`Tile "${partialMatches[0].name}" (${partialMatches[0].code}) selected automatically`, {
          duration: 3000
        });
      } else if (partialMatches.length > 1) {
        // Show filtered results
        console.log('Multiple partial matches found:', partialMatches.length);
        toast.success(`Found ${partialMatches.length} matching tiles for "${tileCode}". Please select one.`, {
          duration: 3000
        });
      } else {
        // No matches found
        console.log('No matches found for:', tileCode);
        toast.error(`No tiles found matching "${tileCode}". Please check the code and try again.`, {
          duration: 4000
        });
      }
    }
    
    setIsQRScannerOpen(false);
  };

  const calculatePricePerSqFt = (tile: Tile) => {
    if (!tile.price_per_box || !tile.pieces_per_box || !tile.size_length || !tile.size_breadth) {
      return 0;
    }
    
    const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
    const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764; // Convert to sq ft
    return tile.price_per_box / areaPerBoxSqFt;
  };

  const formatTileSize = (tile: Tile) => {
    if (!tile.size_length || !tile.size_breadth) return 'N/A';
    
    const lengthInMm = tile.size_length;
    const widthInMm = tile.size_breadth;
    
    if (lengthInMm >= 1000 || widthInMm >= 1000) {
      const lengthInM = (lengthInMm / 1000).toFixed(2);
      const widthInM = (widthInMm / 1000).toFixed(2);
      return `${lengthInM} × ${widthInM} m`;
    } else if (lengthInMm >= 100 || widthInMm >= 100) {
      const lengthInCm = (lengthInMm / 10).toFixed(1);
      const widthInCm = (widthInMm / 10).toFixed(1);
      return `${lengthInCm} × ${widthInCm} cm`;
    } else {
      return `${lengthInMm} × ${widthInMm} mm`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Select Tile</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and QR Section */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tiles by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setIsQRScannerOpen(true)}
              variant="outline"
              className="gap-2 px-4"
            >
              <QrCode className="h-4 w-4" />
              Scan QR
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTiles.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No tiles found</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Try adjusting your search terms or scan a QR code" : "No tiles are available"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTiles.map((tile) => {
                  const pricePerSqFt = calculatePricePerSqFt(tile);
                  const isSelected = selectedTileIds.includes(tile.id);
                  
                  return (
                    <Card 
                      key={tile.id} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                      onClick={() => handleTileSelect(tile.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            {tile.name}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {tile.code}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        {tile.image_url && (
                          <div className="w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                            <img 
                              src={tile.image_url} 
                              alt={tile.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Size:</span>
                            <span className="text-sm font-medium">{formatTileSize(tile)}</span>
                          </div>
                          
                          {tile.pieces_per_box && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Pieces/Box:</span>
                              <span className="text-sm font-medium">{tile.pieces_per_box}</span>
                            </div>
                          )}
                          
                          {tile.price_per_box && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Price/Box:</span>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                                  <IndianRupee className="h-4 w-4" />
                                  {tile.price_per_box.toLocaleString()}
                                </div>
                                {pricePerSqFt > 0 && (
                                  <div className="text-xs text-gray-500">
                                    ₹{pricePerSqFt.toFixed(2)}/sq ft
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          className="w-full mt-3"
                          variant={isSelected ? "secondary" : "default"}
                        >
                          {isSelected ? "Selected" : "Select Tile"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* QR Scanner */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScanned}
      />
    </Dialog>
  );
};
