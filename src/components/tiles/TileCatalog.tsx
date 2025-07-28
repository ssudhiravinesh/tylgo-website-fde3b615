// src/components/tiles/TileCatalog.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  QrCode, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List, 
  Download,
  Eye,
  ShoppingCart,
  Heart,
  Star,
  Zap
} from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { TileCard } from "./TileCard";
import { TileDetailsDialog } from "./TileDetailsDialog";
import { EmptyTileState } from "./EmptyTileState";
import { Html5QRScanner } from "@/components/qr/Html5QRScanner";
import { toast } from "sonner";
import type { Tile } from "@/hooks/useTiles";
// import { Html5QRScanner } from "@/components/qr/Html5QRScanner"; // Alternative option

interface TileCatalogProps {
  isSelectionMode?: boolean;
  onTileSelect?: (tileId: string) => void;
}

export const TileCatalog = ({ isSelectionMode = false, onTileSelect }: TileCatalogProps) => {
  const { data: tiles = [], isLoading: loading, error } = useTiles();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  // Enhanced QR scan handler that populates search box
  const handleQRScanned = (tileCode: string) => {
    console.log('QR Code scanned:', tileCode);
    
    if (!tileCode || tileCode.trim() === '') {
      toast.error('Invalid QR code. Please try again.');
      return;
    }

    const normalizedCode = tileCode.trim();
    
    // Auto-populate the search box with the scanned code
    setSearchTerm(normalizedCode);
    
    // Find matching tiles
    const exactMatches = tiles.filter(tile => 
      tile.code?.toLowerCase() === normalizedCode.toLowerCase() ||
      tile.name?.toLowerCase().includes(normalizedCode.toLowerCase())
    );
    
    if (exactMatches.length > 0) {
      // If exactly one match, show details
      if (exactMatches.length === 1) {
        setSelectedTile(exactMatches[0]);
        setIsDetailsOpen(true);
        toast.success(`Found tile: ${exactMatches[0].name}`);
      } else {
        toast.success(`Found ${exactMatches.length} matching tiles`);
      }
    } else {
      // Try partial matches
      const partialMatches = tiles.filter(tile =>
        tile.code?.toLowerCase().includes(normalizedCode.toLowerCase()) ||
        tile.name?.toLowerCase().includes(normalizedCode.toLowerCase())
      );
      
      if (partialMatches.length > 0) {
        toast.success(`Found ${partialMatches.length} similar tiles`);
      } else {
        toast.info(`No tiles found matching "${tileCode}". The search term has been added to help you search manually.`);
      }
    }
  };

  // Generate alphabet navigation based on tile codes (numbers first, then letters)
  const alphabetLetters = useMemo(() => {
    const chars = new Set<string>();
    tiles.forEach(tile => {
      const firstChar = tile.code?.charAt(0).toUpperCase();
      if (firstChar && /^[A-Z0-9]$/.test(firstChar)) {
        chars.add(firstChar);
      }
    });
    const sortedChars = Array.from(chars).sort((a, b) => {
      // Numbers first, then letters
      const aIsNumber = /^\d$/.test(a);
      const bIsNumber = /^\d$/.test(b);
      
      if (aIsNumber && !bIsNumber) return -1;
      if (!aIsNumber && bIsNumber) return 1;
      return a.localeCompare(b);
    });
    return sortedChars;
  }, [tiles]);

  // Filter and sort tiles
  const filteredAndSortedTiles = useMemo(() => {
    let filtered = tiles.filter(tile => {
      const matchesSearch = 
        tile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tile.code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPrice = !tile.price_per_box || (tile.price_per_box >= priceRange[0] && tile.price_per_box <= priceRange[1]);
      
      return matchesSearch && matchesPrice;
    });

    // Sort tiles by code (numbers first, then alphabets) when using default sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Tile];
      let bValue: any = b[sortBy as keyof Tile];
      
      // For code sorting, implement numbers-first logic
      if (sortBy === 'code') {
        const aCode = (aValue || '').toString();
        const bCode = (bValue || '').toString();
        
        const aStartsWithNumber = /^\d/.test(aCode);
        const bStartsWithNumber = /^\d/.test(bCode);
        
        if (aStartsWithNumber && !bStartsWithNumber) return sortOrder === "asc" ? -1 : 1;
        if (!aStartsWithNumber && bStartsWithNumber) return sortOrder === "asc" ? 1 : -1;
        
        return sortOrder === "asc" ? aCode.localeCompare(bCode) : bCode.localeCompare(aCode);
      }
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tiles, searchTerm, selectedCategory, selectedBrand, priceRange, sortBy, sortOrder]);

  // Scroll to character section (based on tile code)
  const scrollToLetter = (char: string) => {
    if (!gridRef.current) return;
    
    const tileElements = gridRef.current.querySelectorAll('[data-tile-code]');
    for (const element of tileElements) {
      const tileCode = element.getAttribute('data-tile-code');
      if (tileCode && tileCode.charAt(0).toUpperCase() === char) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  // Simple view toggle component
  const ViewToggle = ({ viewMode, setViewMode }: { viewMode: "grid" | "list", setViewMode: (mode: "grid" | "list") => void }) => (
    <div className="flex border rounded-lg">
      <Button
        variant={viewMode === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => setViewMode("grid")}
      >
        <Grid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => setViewMode("list")}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );

  // Handle tile click
  const handleTileClick = (tile: Tile) => {
    if (isSelectionMode && onTileSelect) {
      onTileSelect(tile.id);
    } else {
      // Check if we're in tile selection context from room management
      const selectionContext = sessionStorage.getItem('tileSelectionContext');
      
      if (selectionContext) {
        try {
          const context = JSON.parse(selectionContext);
          // Auto-assign tile to room and redirect back
          const event = new CustomEvent('autoAssignTile', {
            detail: {
              tileId: tile.id,
              roomId: context.roomId,
              isWallTile: context.isWallTile,
              customerId: context.customerId
            }
          });
          window.dispatchEvent(event);
          
          // Clear the context
          sessionStorage.removeItem('tileSelectionContext');
          
          // Navigate back to tile selection
          window.dispatchEvent(new CustomEvent('navigateToTileSelection'));
          
          toast.success(`Tile "${tile.name}" assigned to room successfully!`);
          return;
        } catch (error) {
          console.error('Error parsing tile selection context:', error);
        }
      }
      
      setSelectedTile(tile);
      setIsDetailsOpen(true);
    }
  };

  const toggleFavorite = (tileId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(tileId)) {
      newFavorites.delete(tileId);
      toast.success('Removed from favorites');
    } else {
      newFavorites.add(tileId);
      toast.success('Added to favorites');
    }
    setFavorites(newFavorites);
  };

  const toggleCart = (tileId: string) => {
    const newCart = new Set(cart);
    if (newCart.has(tileId)) {
      newCart.delete(tileId);
      toast.success('Removed from cart');
    } else {
      newCart.add(tileId);
      toast.success('Added to cart');
    }
    setCart(newCart);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setPriceRange([0, 1000]);
    setSortBy("name");
    setSortOrder("asc");
    toast.success('Filters cleared');
  };

  const styles = {
  tilesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 20px)',
    gridTemplateRows: 'repeat(3, 20px)',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  tile: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    animation: 'tileAnimation 1.2s ease-in-out infinite',
  },
  tileBlue: {
    backgroundColor: '#3B82F6',
  },
  tileBeige: {
    backgroundColor: '#F5F5DC',
  },
  tileLight: {
    backgroundColor: '#93C5FD',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  progressBar: {
    width: '200px',
    height: '4px',
    backgroundColor: '#E5E7EB',
    borderRadius: '2px',
    overflow: 'hidden',
    margin: '0 auto',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(90deg, #3B82F6, #93C5FD, #3B82F6)',
    backgroundSize: '200% 100%',
    animation: 'progressFlow 2s linear infinite',
  },
};
  
  if (loading) {
     return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
            <div className="text-center">
              {/* Tile Loading Animation */}
              <div style={styles.tilesContainer}>
                {[...Array(12)].map((_, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.tile,
                      ...styles[`tile${index % 3 === 0 ? 'Blue' : index % 3 === 1 ? 'Beige' : 'Light'}`],
                      animationDelay: `${index * 0.08}s`
                    }}
                  />
                ))}
              </div>
              
              <p style={styles.loadingText}>Loading...</p>
              
              <div style={styles.progressBar}>
                <div style={styles.progressFill}></div>
              </div>
            </div>
          </div>
        );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading tiles: {error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tile Catalog</h1>
          <p className="text-gray-600">Browse and search through our tile collection</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            {filteredAndSortedTiles.length} tiles
          </Badge>
          {cart.size > 0 && (
            <Badge variant="default">
              <ShoppingCart className="h-3 w-3 mr-1" />
              {cart.size}
            </Badge>
          )}
          {favorites.size > 0 && (
            <Badge variant="secondary">
              <Heart className="h-3 w-3 mr-1" />
              {favorites.size}
            </Badge>
          )}
        </div>
      </div>

      {/* Search and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tiles by name, code, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsQRScannerOpen(true)}
                className="flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Scan QR
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Active Filters */}
      {searchTerm && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">Active filters:</span>
          <Badge variant="secondary">
            Search: {searchTerm}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1"
              onClick={() => setSearchTerm("")}
            >
              ×
            </Button>
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-red-600 hover:text-red-700"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Tiles Grid/List with Alphabet Navigation */}
      {filteredAndSortedTiles.length === 0 ? (
        <EmptyTileState />
      ) : (
        <div className="flex gap-4">
          {/* Alphabet Navigation Sidebar */}
          <div className="hidden lg:block">
            <Card className="sticky top-4 w-12">
              <CardContent className="p-2">
                <ScrollArea className="h-[500px]">
                  <div className="flex flex-col gap-1">
                    {alphabetLetters.map((char) => (
                      <Button
                        key={char}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-xs font-medium hover:bg-primary/10"
                        onClick={() => scrollToLetter(char)}
                        title={`Jump to ${char}`}
                      >
                        {char}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Tiles Grid/List */}
          <div className="flex-1">
            <div 
              ref={gridRef}
              className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {filteredAndSortedTiles.map((tile) => (
                <div key={tile.id} data-tile-code={tile.code}>
                  <TileCard
                    tile={tile}
                    isSelected={false}
                    isAdmin={false}
                    showAssignButton={false}
                    onTileSelect={() => handleTileClick(tile)}
                    onGenerateQR={() => {}}
                    onDownloadQR={() => {}}
                    onViewDetails={() => handleTileClick(tile)}
                    onAssignClick={() => {}}
                    isGeneratingQR={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Dialog */}
      <Html5QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScanned}
      />

      {/* Tile Details Dialog */}
      {selectedTile && (
        <TileDetailsDialog
          tile={selectedTile}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          userRole="worker"
        />
      )}
    </div>
  );
};
