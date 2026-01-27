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
  Zap,
  ArrowLeft,
  Layers
} from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { TileCard } from "./TileCard";
import { TileDetailsDialog } from "./TileDetailsDialog";
import { EmptyTileState } from "./EmptyTileState";
import { Html5QRScanner } from "@/components/qr/Html5QRScanner";
import { toast } from "sonner";
import type { Tile } from "@/hooks/useTiles";
import { GridLoader } from "@/components/ui/GridLoader";

// Add to TileCatalogProps interface
interface TileCatalogProps {
  isSelectionMode?: boolean;
  onTileSelect?: (tileId: string) => void;
  // New props for auto-assignment
  autoAssignmentContext?: {
    roomId: string;
    roomName: string;
    isWallTile: boolean;
    layerNumber?: number;
  };
  onAutoAssignment?: (tileId: string) => void;
  onNavigateBack?: () => void;
  onAssignTile?: (tile: Tile) => void;
}

export const TileCatalog = ({
  isSelectionMode = false,
  onTileSelect,
  autoAssignmentContext,
  onAutoAssignment,
  onNavigateBack,
  onAssignTile
}: TileCatalogProps) => {
  const { data: tiles, totalCount, isLoading: loading, error, refetch } = useTiles();


  console.log(`Received ${tiles.length} tiles out of total ${totalCount}`);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  // Renamed to avoid partial conflict with new category logic, though we might sync them
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [sortBy, setSortBy] = useState<string>("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());

  const [alphabeticalIndex, setAlphabeticalIndex] = useState<string>('');
  const [showAlphabetNav, setShowAlphabetNav] = useState(false);

  // --- NEW: Category View State ---
  const [catalogView, setCatalogView] = useState<'categories' | 'tiles'>('categories');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Auto-switch to tiles view if searching
  useEffect(() => {
    if (searchTerm || alphabeticalIndex) {
      setCatalogView('tiles');
    } else if (!activeCategoryFilter) {
      // Only go back to categories if we aren't specifically inside a category
      // Actually, let's keep it simple: If search is cleared and no category selected, maybe go back?
      // But user might have just cleared search to see the category they tapped.
      // So: Only force to tiles if there IS a search.
    }
  }, [searchTerm, alphabeticalIndex]);


  const getAlphaKey = (tile: Tile): string => {
    const value = (tile.code || '').trim();
    if (!value) return '#';  // fallback if nothing exists
    const firstChar = value.charAt(0).toUpperCase();
    if (/[0-9]/.test(firstChar)) return firstChar;     // Individual digit
    if (/[A-Z]/.test(firstChar)) return firstChar;     // Letter A-Z
    return '#';  // All other cases (symbols etc.)
  };

  const availableKeys = Array.from(
    new Set(
      tiles
        .map(getAlphaKey)
        .filter(Boolean)
    )
  );

  // Always sort: first digits, then letters, then #
  const numbers = availableKeys.filter((char) => /[0-9]/.test(char)).sort();
  const letters = availableKeys.filter((char) => /[A-Z]/.test(char)).sort();
  const others = availableKeys.filter((char) => !/[0-9A-Z]/.test(char));
  const displayKeys = [...numbers, ...letters, ...others];


  const AlphabeticalNavigation = ({
    tiles,
    onLetterClick,
    activeLetter,
  }: {
    tiles: Tile[];
    onLetterClick: (letter: string) => void;
    activeLetter: string;
  }) => {

    // Get unique, sorted keys for navigation
    const availableKeys = Array.from(
      new Set(
        tiles.map(getAlphaKey).filter(Boolean)
      )
    );
    const numbers = availableKeys.filter(char => /[0-9]/.test(char)).sort();
    const letters = availableKeys.filter(char => /[A-Z]/.test(char)).sort();
    const others = availableKeys.filter(char => !/[0-9A-Z]/.test(char));
    const displayKeys = [...numbers, ...letters, ...others];

    return (
      <div className="bg-white border rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Quick Navigation</span>
          <Badge variant="outline" className="text-xs">{tiles.length} tiles</Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={activeLetter === '' ? "default" : "outline"}
            size="sm"
            onClick={() => onLetterClick('')}
            className="h-8 w-12 p-0 text-xs"
          >
            All
          </Button>
          {displayKeys.map(letter => (
            <Button
              key={letter}
              variant={activeLetter === letter ? "default" : "outline"}
              size="sm"
              onClick={() => onLetterClick(letter)}
              className="h-8 w-8 p-0 text-xs"
            >
              {letter}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced QR scan handler that populates search box
  const handleQRScanned = (tileCode: string) => {
    console.log('QR Code scanned:', tileCode);

    if (!tileCode || tileCode.trim() === '') {
      toast.error('Invalid QR code. Please try again.');
      return;
    }

    const normalizedCode = tileCode.trim();

    // Auto-populate the search box with the scanned code
    // This will trigger the effect to switch to 'tiles' view
    setSearchTerm(normalizedCode);

    // Find matching tiles
    const exactMatches = tiles.filter(tile =>
      tile.code?.toLowerCase().includes(normalizedCode.toLowerCase())
    );

    if (exactMatches.length > 0) {
      // If exactly one match, show details
      if (exactMatches.length === 1) {
        setSelectedTile(exactMatches[0]);
        setIsDetailsOpen(true);
        toast.success(`Found tile: ${exactMatches[0].code}`);
      } else {
        toast.success(`Found ${exactMatches.length} matching tiles`);
      }
    } else {
      // Try partial matches
      const partialMatches = tiles.filter(tile =>
        tile.code?.toLowerCase().includes(normalizedCode.toLowerCase())
      );

      if (partialMatches.length > 0) {
        toast.success(`Found ${partialMatches.length} similar tiles`);
      } else {
        toast.info(`No tiles found matching "${tileCode}". The search term has been added to help you search manually.`);
      }
    }
  };

  // --- DERIVE CATEGORIES ---
  const categoryStats = useMemo(() => {
    const stats = new Map<string, number>();
    tiles.forEach(tile => {
      const cat = tile.category || 'Uncategorized';
      stats.set(cat, (stats.get(cat) || 0) + 1);
    });
    return Array.from(stats.entries()).map(([name, count]) => ({ name, count }));
  }, [tiles]);


  const filteredAndSortedTiles = useMemo(() => {
    // 1. FILTERING
    let filtered = tiles.filter(tile => {
      // Category Filter (Highest Priority if set from Category View)
      if (activeCategoryFilter && activeCategoryFilter !== 'All Tiles') {
        const cat = tile.category || 'Uncategorized';
        if (cat !== activeCategoryFilter) return false;
      }

      const term = searchTerm.toLowerCase();
      const code = (tile.code || '').toLowerCase();

      const matchesSearch = code.includes(term);

      const matchesPrice = !tile.price_per_box || (tile.price_per_box >= priceRange[0] && tile.price_per_box <= priceRange[1]);

      const matchesAlphabet = !alphabeticalIndex || getAlphaKey(tile) === alphabeticalIndex;
      return matchesSearch && matchesPrice && matchesAlphabet;
    });

    // 2. SORTING
    filtered.sort((a, b) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const aCode = (a.code || '').toLowerCase();
        const bCode = (b.code || '').toLowerCase();
        const aStartsWith = aCode.startsWith(term);
        const bStartsWith = bCode.startsWith(term);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
      }

      // --- STANDARD SORT: User Selected Criteria (Name, Price, etc.) ---
      if (sortBy === 'code') {
        const aCode = (a.code || '').toLowerCase();
        const bCode = (b.code || '').toLowerCase();
        const result = aCode.localeCompare(bCode);
        return sortOrder === "asc" ? result : -result;
      } else {
        let aValue: any = a[sortBy as keyof Tile];
        let bValue: any = b[sortBy as keyof Tile];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      }
    });

    return filtered;
  }, [tiles, searchTerm, activeCategoryFilter, priceRange, sortBy, sortOrder, alphabeticalIndex]);

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
    // Check if we're in auto-assignment mode
    if (autoAssignmentContext && onAutoAssignment) {
      // Auto-assign the tile to the room
      onAutoAssignment(tile.id);

      // Show success message with room context
      toast.success(`${tile.code} assigned to ${autoAssignmentContext.roomName}`);

      // Navigate back automatically
      if (onNavigateBack) {
        onNavigateBack();
      }
      return;
    }

    // Existing logic for other selection modes
    if (isSelectionMode && onTileSelect) {
      onTileSelect(tile.id);
    } else {
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
    setSelectedCategory("all"); // Clean up old state
    setActiveCategoryFilter(null); // Clean up new state
    setCatalogView('categories'); // Go back to categories
    setSelectedBrand("all");
    setPriceRange([0, 20000]);
    setSortBy("code"); // Default to code sorting
    setSortOrder("asc");
    setAlphabeticalIndex(''); // Clear alphabetical filter
    toast.success('Filters cleared');
  };

  const handleCategoryClick = (categoryName: string) => {
    setActiveCategoryFilter(categoryName);
    setCatalogView('tiles');
  };

  const handleBackToCategories = () => {
    setActiveCategoryFilter(null);
    setCatalogView('categories');
    setSearchTerm(""); // Clear search when going back? Maybe user preference.
  };


  if (loading) {
    return <GridLoader loadingText="Loading..." />;
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
        <div className="flex items-center gap-2">
          {catalogView === 'tiles' && (
            <Button variant="ghost" size="icon" onClick={handleBackToCategories} className="mr-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeCategoryFilter ? `${activeCategoryFilter} Tiles` : 'Tile Catalog'}
            </h1>
            <p className="text-gray-600">
              {activeCategoryFilter
                ? `Browsing ${activeCategoryFilter} collection`
                : 'Browse and search through our tile collection'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            {filteredAndSortedTiles.length} tiles
            {catalogView === 'categories' && ` in ${categoryStats.length} categories`}
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

      {/* Search and Controls - Visible in both views or just Tile view? 
          Let's make it visible in both, but typing changes view to 'tiles' */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search all tiles by name, code, or SKU..."
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
                <span className="hidden sm:inline">Scan QR</span>
              </Button>
              {catalogView === 'tiles' && (
                <Button
                  variant="outline"
                  onClick={() => setIsFilterOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              )}
              {catalogView === 'tiles' && (
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* VIEW: CATEGORIES */}
      {catalogView === 'categories' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* "All Tiles" Card */}
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-blue-400 border-dashed"
            onClick={() => handleCategoryClick('All Tiles')}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <Grid className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">All Tiles</h3>
              <p className="text-sm text-gray-500 mt-1">{tiles.length} items</p>
            </CardContent>
          </Card>

          {/* Dynamic Category Cards */}
          {categoryStats.map((cat) => (
            <Card
              key={cat.name}
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-blue-400"
              onClick={() => handleCategoryClick(cat.name)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px]">
                {/* Placeholder Icon based on name? Or just generic */}
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Layers className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-800 break-words w-full px-2 line-clamp-2">{cat.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{cat.count} items</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW: TILES */}
      {catalogView === 'tiles' && (
        <>
          {/* Alphabetical Navigation */}
          <AlphabeticalNavigation
            tiles={filteredAndSortedTiles} // Pass filtered tiles so we only see letters relevant to current view? Or original?
            // Better to pass current filtered context or original?
            // Usually alphabetical nav should work on the *displayed* list or allow jumping within it.
            // But normally it's a filter. Let's pass the tiles matching the category.

            onLetterClick={setAlphabeticalIndex}
            activeLetter={alphabeticalIndex}
          />


          {/* Active Filters */}
          {(searchTerm || alphabeticalIndex || (activeCategoryFilter && activeCategoryFilter !== 'All Tiles')) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500">Active filters:</span>

              {activeCategoryFilter && activeCategoryFilter !== 'All Tiles' && (
                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                  Category: {activeCategoryFilter}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-blue-500 rounded-full"
                    onClick={handleBackToCategories}
                  >
                    ×
                  </Button>
                </Badge>
              )}

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
              {alphabeticalIndex && (
                <Badge variant="secondary">
                  Letter: {alphabeticalIndex}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setAlphabeticalIndex("")}
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
            <EmptyTileState />
          ) : (
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8"
                : "space-y-4 pb-8"
            }>
              {filteredAndSortedTiles.map((tile) => (
                <TileCard
                  key={tile.id}
                  tile={tile}
                  isSelected={false}
                  isAdmin={false}
                  showAssignButton={!!onAssignTile}
                  onTileSelect={() => handleTileClick(tile)}
                  onGenerateQR={() => { }}
                  onDownloadQR={() => { }}
                  onViewDetails={() => handleTileClick(tile)}
                  onAssignClick={(e) => {
                    e.stopPropagation();
                    onAssignTile?.(tile);
                  }}
                  isGeneratingQR={false}
                />
              ))}
            </div>
          )}
        </>
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
