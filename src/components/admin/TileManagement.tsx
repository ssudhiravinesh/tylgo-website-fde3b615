
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { GridLoader } from "@/components/ui/GridLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, Plus, Grid3X3, Ruler, IndianRupee, ArrowLeft, QrCode, Download, Upload, Image as ImageIcon, DollarSign, ChevronDown, FileSpreadsheet, Layers } from "lucide-react";
import { CategoryBulkPriceUpdateDialog } from "@/components/tiles/CategoryBulkPriceUpdateDialog";
import { TileFormDialog, type TileFormData } from "./TileFormDialog";
import { useTiles } from "@/hooks/useTiles";
import { useCreateTile, useUpdateTile, useDeleteTile, useGenerateQRForTile } from "@/hooks/useTileManagement";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useUnifiedPDFGeneration } from '@/hooks/useUnifiedPDFGeneration';
import { DownloadCatalogueDialog } from "@/components/tiles/DownloadCatalogueDialog";


interface TileManagementProps {
  onBack?: () => void;
  brandId?: string;
  showroomId?: string;
}

export const TileManagement = ({ onBack, brandId, showroomId }: TileManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTile, setEditingTile] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPriceUpdateDialogOpen, setIsPriceUpdateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [selectedCategoryForView, setSelectedCategoryForView] = useState<string | null>(null);

  const { data: tiles = [], isLoading } = useTiles(false, brandId);
  const createTileMutation = useCreateTile();
  const updateTileMutation = useUpdateTile();
  const deleteTileMutation = useDeleteTile();
  const generateQRMutation = useGenerateQRForTile();
  const { generateTilesPDF, isGenerating: isPDFGenerating } = useUnifiedPDFGeneration();
  const { exportTilesToExcel } = useExcelExport();


  const filteredTiles = tiles.filter(tile => {
    // First filter by selected category if one is set
    if (selectedCategoryForView !== null) {
      if (selectedCategoryForView === 'Uncategorized') {
        if (tile.category) return false;
      } else {
        if (tile.category !== selectedCategoryForView) return false;
      }
    }
    // Then apply search filter
    return (
      tile.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tile.category && tile.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Get unique categories for dropdown
  const categories = Array.from(new Set(tiles.map(tile => tile.category).filter(Boolean))) as string[];

  // Calculate category statistics for the grid view
  const categoryStats = categories.map(category => ({
    name: category,
    count: tiles.filter(t => t.category === category).length
  }));

  // Add Uncategorized if there are tiles without category
  const uncategorizedCount = tiles.filter(t => !t.category).length;
  if (uncategorizedCount > 0) {
    categoryStats.push({ name: 'Uncategorized', count: uncategorizedCount });
  }

  // Always show bulk price update button if there are categories
  const shouldShowPriceUpdateButton = categories.length > 0;

  const handleAddTile = async (data: TileFormData) => {
    const tileData = {
      code: data.code,
      size_length: data.size_length,
      size_breadth: data.size_breadth,
      price_per_box: data.price_per_box || null,
      pieces_per_box: data.pieces_per_box || null,
      image_url: data.image_url || null,
      category: data.category,
    };

    return new Promise<void>((resolve) => {
      createTileMutation.mutate(tileData, {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resolve();
        },
        onError: () => resolve()
      });
    });
  };

  const handleEditTile = async (data: TileFormData) => {
    if (editingTile) {
      const updateData = {
        id: editingTile.id,
        code: data.code,
        size_length: data.size_length,
        size_breadth: data.size_breadth,
        price_per_box: data.price_per_box || null,
        pieces_per_box: data.pieces_per_box || null,
        image_url: data.image_url || null,
        category: data.category,
      };

      return new Promise<void>((resolve) => {
        updateTileMutation.mutate(updateData, {
          onSuccess: () => {
            setIsEditDialogOpen(false);
            setEditingTile(null);
            resolve();
          },
          onError: () => resolve()
        });
      });
    }
  };

  const handleDeleteTile = (tileId: string) => {
    deleteTileMutation.mutate(tileId);
  };

  const handleGenerateQR = async (tileId: string) => {
    await generateQRMutation.mutateAsync(tileId);
  };

  const handleDownloadQR = async (qrUrl: string, tileCode: string) => {
    try {
      // Create a canvas to combine QR code and tile name
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const qrSize = 300;
      const padding = 40;
      const textHeight = 80;
      canvas.width = qrSize + (padding * 2);
      canvas.height = qrSize + textHeight + (padding * 2);

      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load and draw QR code
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = reject;
        qrImage.src = qrUrl;
      });

      // Draw QR code
      ctx.drawImage(qrImage, padding, padding, qrSize, qrSize);

      // Add tile code text (centered, bold)
      ctx.fillStyle = 'black';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tileCode, canvas.width / 2, qrSize + padding + 40);

      // Download as PNG
      const link = document.createElement('a');
      link.download = `${tileCode}-qr-code.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error downloading QR:', error);
      toast.error('Failed to download QR code');
    }
  };

  const handleDownloadTilesPDF = (category?: string) => {
    let tilesToExport = tiles;

    if (category && category !== "all") {
      tilesToExport = tiles.filter(
        (t) => t.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (tilesToExport.length === 0) {
      toast.error("No tiles found to download");
      return;
    }

    try {
      generateTilesPDF(tilesToExport);
      setIsDownloadDialogOpen(false);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleDownloadTilesExcel = (category?: string) => {
    let tilesToExport = tiles;

    if (category && category !== "all") {
      tilesToExport = tiles.filter(
        (t) => t.category?.toLowerCase() === category.toLowerCase()
      );
    }

    if (tilesToExport.length === 0) {
      toast.error("No tiles found to download");
      return;
    }

    try {
      exportTilesToExcel(tilesToExport);
      setIsDownloadDialogOpen(false);
      toast.success("Excel file downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate Excel file. Please try again.");
    }
  };

  const openEditDialog = (tile: any) => {
    setEditingTile(tile);
    setIsEditDialogOpen(true);
  };

  // Calculate price per sq ft for display
  const calculatePricePerSqFt = (tile: any) => {
    if (!tile.price_per_box || !tile.pieces_per_box || !tile.size_length || !tile.size_breadth) {
      return 0;
    }

    const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
    const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764; // Convert to sq ft
    return tile.price_per_box / areaPerBoxSqFt;
  };

  if (isLoading) {
    return <GridLoader loadingText="Loading tiles..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Panel
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tile Management</h1>
          <p className="text-muted-foreground">Manage your tile catalog database and QR codes</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search by tile code or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            className="pl-10 h-12 border-border focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="flex gap-2">
          {shouldShowPriceUpdateButton && (
            <Button
              onClick={() => setIsPriceUpdateDialogOpen(true)}
              className="btn-primary-craft gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Bulk Price Update
            </Button>
          )}

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsDownloadDialogOpen(true)}
          >
            <Download className="h-4 w-4" />
            Download Catalogue
          </Button>

          <DownloadCatalogueDialog
            isOpen={isDownloadDialogOpen}
            onClose={() => setIsDownloadDialogOpen(false)}
            onDownloadPDF={handleDownloadTilesPDF}
            onDownloadExcel={handleDownloadTilesExcel}
            isGenerating={isPDFGenerating}
          />

          <Button className="bg-primary hover:bg-primary/90 text-white gap-2" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add New Tile
              </Button>
              <TileFormDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                mode="add"
                categories={categories}
                onSubmit={handleAddTile}
                isPending={createTileMutation.isPending}
              />
        </div>
      </div>

      {/* Category Bulk Price Update Dialog */}
      <CategoryBulkPriceUpdateDialog
        isOpen={isPriceUpdateDialogOpen}
        onClose={() => setIsPriceUpdateDialogOpen(false)}
      />

      {/* Category Grid View or Tile Table View */}
      {selectedCategoryForView === null ? (
        /* Category Grid View */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Tile Categories ({categoryStats.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryStats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryStats.map((cat) => (
                    <div
                      key={cat.name}
                      onClick={() => setSelectedCategoryForView(cat.name)}
                      className="group cursor-pointer bg-gradient-to-br from-card to-muted/50 border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/40 hover:from-primary/5 hover:to-card transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-primary/15 rounded-lg group-hover:bg-primary/25 transition-colors">
                          <Grid3X3 className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="secondary" className="text-sm font-semibold">
                          {cat.count} {cat.count === 1 ? 'tile' : 'tiles'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground text-lg group-hover:text-primary/80 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click to view tiles
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No categories found</h3>
                  <p className="text-muted-foreground">Add tiles with categories to see them here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Tile Table View (filtered by category) */
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategoryForView(null);
              setSearchTerm("");
            }}
            className="gap-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-primary" />
                {selectedCategoryForView} ({filteredTiles.length} tiles)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Tile Image</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Price Info</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTiles.map((tile) => {
                    const pricePerSqFt = calculatePricePerSqFt(tile);
                    return (
                      <TableRow key={tile.id}>
                        <TableCell className="font-mono">
                          {tile.code}
                        </TableCell>
                        <TableCell>
                          {tile.image_url ? (
                            <img
                              src={tile.image_url}
                              alt={tile.code}
                              className="w-16 h-16 object-cover rounded border border-border"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded border border-border flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {tile.category && (
                            <Badge variant="outline" className="text-xs">
                              {tile.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Ruler className="h-3 w-3" />
                            {tile.size_length} × {tile.size_breadth} mm
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {tile.price_per_box && (
                              <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                                <IndianRupee className="h-4 w-4" />
                                {tile.price_per_box}/box
                              </div>
                            )}
                            {pricePerSqFt > 0 && (
                              <div className="text-xs text-muted-foreground">
                                ₹{pricePerSqFt.toFixed(2)}/sq ft
                              </div>
                            )}
                            {tile.pieces_per_box && (
                              <div className="text-xs text-muted-foreground">
                                {tile.pieces_per_box} pcs/box
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tile.qr_code_url ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadQR(tile.qr_code_url!, tile.code)}
                                  className="gap-1"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateQR(tile.id)}
                                disabled={generateQRMutation.isPending}
                                className="gap-1"
                              >
                                <QrCode className="h-3 w-3" />
                                {generateQRMutation.isPending ? 'Generating...' : 'Generate QR'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(tile)}
                              className="gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tile</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{tile.code}"?
                                    This action cannot be undone and will remove the tile from all quotations.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTile(tile.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredTiles.length === 0 && (
                <div className="text-center py-12">
                  <Grid3X3 className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No tiles found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms" : "No tiles in this category yet"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Dialog */}
      <TileFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); setEditingTile(null); }}
        mode="edit"
        initialData={editingTile}
        categories={categories}
        onSubmit={handleEditTile}
        isPending={updateTileMutation.isPending}
      />
    </div>
  );
};
