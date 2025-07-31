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
import { Html5QRScanner } from "@/components/qr/Html5QRScanner";
import { toast } from "sonner";
import type { Tile } from "@/hooks/useTiles";
// import { Html5QRScanner } from "@/components/qr/Html5QRScanner"; // Alternative option

interface TileCatalogProps {
  isSelectionMode?: boolean;
  onTileSelect?: (tileId: string) => void;
}

export const TileCatalog = ({ isSelectionMode = false, onTileSelect }: TileCatalogProps) => {
const { data: tiles, totalCount, isLoading: loading, error, refetch } = useTiles();


console.log(`Received ${tiles.length} tiles out of total ${totalCount}`);

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

const [alphabeticalIndex, setAlphabeticalIndex] = useState<string>('');
const [showAlphabetNav, setShowAlphabetNav] = useState(false);
  
const getAlphaKey = (tile: Tile): string => {
  const value = (tile.code || tile.name || '').trim();
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
  
const filteredAndSortedTiles = useMemo(() => {
  let filtered = tiles.filter(tile => {
    const matchesSearch = 
      tile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tile.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPrice = !tile.price_per_box || (tile.price_per_box >= priceRange[0] && tile.price_per_box <= priceRange[1]);
    
    // Alphabetical index filtering
    const matchesAlphabet = !alphabeticalIndex || getAlphaKey(tile) === alphabeticalIndex;

    // You may want to include category and brand filters here too:
    // const matchesCategory = selectedCategory === "all" || tile.category === selectedCategory;
    // const matchesBrand = selectedBrand === "all" || tile.brand === selectedBrand;

    return matchesSearch && matchesPrice && matchesAlphabet;
  });  // <-- close the filter here

  filtered.sort((a, b) => {
    if (sortBy === 'name') {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const result = aName.localeCompare(bName);
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
}, [tiles, searchTerm, selectedCategory, selectedBrand, priceRange, sortBy, sortOrder, alphabeticalIndex]);



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
  setSortBy("name"); // Default to name sorting for better alphabetical experience
  setSortOrder("asc");
  setAlphabeticalIndex(''); // Clear alphabetical filter
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
            {tiles.length} of {totalCount} tiles
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
  
      {/* Alphabetical Navigation */}
      <AlphabeticalNavigation 
        tiles={tiles}
        onLetterClick={setAlphabeticalIndex}
        activeLetter={alphabeticalIndex}
      />

      
      {/* Active Filters */}
      {(searchTerm || alphabeticalIndex) && (
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
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredAndSortedTiles.map((tile) => (
            <TileCard
              key={tile.id}
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
          ))}
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
