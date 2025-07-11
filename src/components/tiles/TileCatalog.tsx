// src/components/tiles/TileCatalog.tsx
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { FilterPanel } from "./FilterPanel";
import { SortingOptions } from "./SortingOptions";
import { ViewToggle } from "./ViewToggle";
import { Tile } from "@/types/tile";
import { toast } from "sonner";

// Import the new QR scanner components
import { ModernQRScanner } from "@/components/qr/ModernQRScanner";
// import { Html5QRScanner } from "@/components/qr/Html5QRScanner"; // Alternative option

export const TileCatalog = () => {
  const { tiles, loading, error } = useTiles();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());

  // Enhanced QR scan handler with better error handling and user feedback
  const handleQRScanned = (tileCode: string) => {
    console.log('QR Code scanned:', tileCode);
    
    if (!tileCode || tileCode.trim() === '') {
      toast.error('Invalid QR code. Please try again.');
      return;
    }

    const normalizedCode = tileCode.trim().toUpperCase();
    
    // Update search term
    setSearchTerm(normalizedCode);
    
    // Find exact matches
    const exactMatches = tiles.filter(tile => 
      tile.code?.toUpperCase() === normalizedCode ||
      tile.name?.toUpperCase().includes(normalizedCode) ||
      tile.sku?.toUpperCase() === normalizedCode
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
        tile.code?.toUpperCase().includes(normalizedCode) ||
        tile.name?.toUpperCase().includes(normalizedCode) ||
        tile.sku?.toUpperCase().includes(normalizedCode) ||
        tile.description?.toUpperCase().includes(normalizedCode)
      );
      
      if (partialMatches.length > 0) {
        toast.success(`Found ${partialMatches.length} similar tiles`);
      } else {
        toast.error(`No tiles found matching "${tileCode}". Please check the code and try again.`);
      }
    }
    
    // Close QR scanner
    setIsQRScannerOpen(false);
  };

  // Filter and sort tiles
  const filteredAndSortedTiles = useMemo(() => {
    let filtered = tiles.filter(tile => {
      const matchesSearch = 
        tile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tile.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tile.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tile.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || tile.category === selectedCategory;
      const matchesBrand = selectedBrand === "all" || tile.brand === selectedBrand;
      const matchesPrice = tile.price >= priceRange[0] && tile.price <= priceRange[1];
      
      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });

    // Sort tiles
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Tile];
      let bValue: any = b[sortBy as keyof Tile];
      
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

  // Get unique categories and brands for filtering
  const categories = useMemo(() => 
    Array.from(new Set(tiles.map(tile => tile.category).filter(Boolean))), 
    [tiles]
  );
  
  const brands = useMemo(() => 
    Array.from(new Set(tiles.map(tile => tile.brand).filter(Boolean))), 
    [tiles]
  );

  const handleTileClick = (tile: Tile) => {
    setSelectedTile(tile);
    setIsDetailsOpen(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading tiles: {error}</p>
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
      {(searchTerm || selectedCategory !== "all" || selectedBrand !== "all") && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">Active filters:</span>
          {searchTerm && (
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
          )}
          {selectedCategory !== "all" && (
            <Badge variant="secondary">
              Category: {selectedCategory}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setSelectedCategory("all")}
              >
                ×
              </Button>
            </Badge>
          )}
          {selectedBrand !== "all" && (
            <Badge variant="secondary">
              Brand: {selectedBrand}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setSelectedBrand("all")}
              >
                ×
              </Button>
            </Badge>
          )}
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

      {/* Tiles Grid/List */}
      {filteredAndSortedTiles.length === 0 ? (
        <EmptyTileState 
          searchTerm={searchTerm}
          onClearSearch={() => setSearchTerm("")}
          onScanQR={() => setIsQRScannerOpen(true)}
        />
      ) : (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredAndSortedTiles.map((tile) => (
            <TileCard
              key={tile.id}
              tile={tile}
              onClick={() => handleTileClick(tile)}
              onToggleFavorite={() => toggleFavorite(tile.id)}
              onToggleCart={() => toggleCart(tile.id)}
              isFavorite={favorites.has(tile.id)}
              isInCart={cart.has(tile.id)}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* QR Scanner Dialog */}
      <ModernQRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScanned}
      />

      {/* Alternative QR Scanner - uncomment to use html5-qrcode instead */}
      {/* <Html5QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScanned}
      /> */}

      {/* Tile Details Dialog */}
      <TileDetailsDialog
        tile={selectedTile}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        categories={categories}
        brands={brands}
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        priceRange={priceRange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onCategoryChange={setSelectedCategory}
        onBrandChange={setSelectedBrand}
        onPriceRangeChange={setPriceRange}
        onSortChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onClearFilters={clearFilters}
      />
    </div>
  );
};