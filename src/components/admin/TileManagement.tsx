
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, Plus, Grid3X3, Ruler, IndianRupee, ArrowLeft, QrCode, Download, Upload, Image as ImageIcon, DollarSign } from "lucide-react";
import { CategoryBulkPriceUpdateDialog } from "@/components/tiles/CategoryBulkPriceUpdateDialog";
import { useTiles } from "@/hooks/useTiles";
import { useCreateTile, useUpdateTile, useDeleteTile, useGenerateQRForTile } from "@/hooks/useTileManagement";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useTilesPDFGeneration } from "@/hooks/useTilesPDFGeneration";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const tileSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  size_length: z.number().min(1, "Length must be greater than 0"),
  size_breadth: z.number().min(1, "Breadth must be greater than 0"),
  price_per_box: z.number().min(0, "Price must be 0 or greater").optional(),
  pieces_per_box: z.number().min(1, "Pieces per box must be greater than 0").optional(),
  image_url: z.string().optional(),
  category: z.string().min(1, "Category is required"),
}).transform((data) => ({
  ...data,
  // Ensure undefined values are handled properly for optional fields
  price_per_box: data.price_per_box || undefined,
  pieces_per_box: data.pieces_per_box || undefined,
}));

type TileFormData = z.infer<typeof tileSchema>;

interface TileManagementProps {
  onBack: () => void;
}

export const TileManagement = ({ onBack }: TileManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTile, setEditingTile] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPriceUpdateDialogOpen, setIsPriceUpdateDialogOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: tiles = [], isLoading } = useTiles();
  const createTileMutation = useCreateTile();
  const updateTileMutation = useUpdateTile();
  const deleteTileMutation = useDeleteTile();
  const generateQRMutation = useGenerateQRForTile();
  const { uploadImage, isUploading } = useImageUpload();
  const { generateTilesPDF } = useTilesPDFGeneration();

  const form = useForm<TileFormData>({
    resolver: zodResolver(tileSchema),
    defaultValues: {
      code: "",
      name: "",
      size_length: undefined,
      size_breadth: undefined,
      price_per_box: undefined,
      pieces_per_box: undefined,
      image_url: "",
      category: "",
    },
  });

  const filteredTiles = tiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique categories for dropdown
  const categories = Array.from(new Set(tiles.map(tile => tile.category).filter(Boolean)));
  
  // Always show bulk price update button if there are categories
  const shouldShowPriceUpdateButton = categories.length > 0;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const resetImageStates = () => {
    setSelectedImageFile(null);
    setImagePreview("");
  };

  const handleAddTile = async (data: TileFormData) => {
    let imageUrl = data.image_url || null;
    
    // If user selected a file, upload it first
    if (selectedImageFile) {
      const uploadedUrl = await uploadImage(selectedImageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    const tileData = {
      code: data.code,
      name: data.name,
      size_length: data.size_length,
      size_breadth: data.size_breadth,
      price_per_box: data.price_per_box || null,
      pieces_per_box: data.pieces_per_box || null,
      image_url: imageUrl,
      category: data.category,
    };
    
    createTileMutation.mutate(tileData, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        form.reset();
        resetImageStates();
      },
    });
  };

  const handleEditTile = async (data: TileFormData) => {
    if (editingTile) {
      let imageUrl = data.image_url || null;
      
      // If user selected a new file, upload it first
      if (selectedImageFile) {
        const uploadedUrl = await uploadImage(selectedImageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const updateData = {
        id: editingTile.id,
        code: data.code,
        name: data.name,
        size_length: data.size_length,
        size_breadth: data.size_breadth,
        price_per_box: data.price_per_box || null,
        pieces_per_box: data.pieces_per_box || null,
        image_url: imageUrl,
        category: data.category,
      };
      
      updateTileMutation.mutate(updateData, {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingTile(null);
          form.reset();
          resetImageStates();
        },
      });
    }
  };

  const handleDeleteTile = (tileId: string) => {
    deleteTileMutation.mutate(tileId);
  };

  const handleGenerateQR = async (tileId: string) => {
    await generateQRMutation.mutateAsync(tileId);
  };

  const handleDownloadQR = async (qrUrl: string, tileCode: string, tileName: string) => {
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

      // Add tile name text
      ctx.fillStyle = 'black';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tileName, canvas.width / 2, qrSize + padding + 25);
      
      // Add tile code text
      ctx.font = '14px Arial';
      ctx.fillText(`Code: ${tileCode}`, canvas.width / 2, qrSize + padding + 50);

      // Download as PNG
      const link = document.createElement('a');
      link.download = `${tileCode}-qr-code.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const handleDownloadTilesPDF = () => {
    console.log('Download PDF clicked, tiles count:', filteredTiles.length);
    if (filteredTiles.length === 0) {
      toast.error('No tiles to download');
      return;
    }
    try {
      console.log('Calling generateTilesPDF with tiles:', filteredTiles);
      generateTilesPDF(filteredTiles);
    } catch (error) {
      console.error('Error calling generateTilesPDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const openEditDialog = (tile: any) => {
    setEditingTile(tile);
    form.reset({
      code: tile.code,
      name: tile.name,
      size_length: tile.size_length,
      size_breadth: tile.size_breadth,
      price_per_box: tile.price_per_box || undefined,
      pieces_per_box: tile.pieces_per_box || undefined,
      image_url: tile.image_url || "",
      category: tile.category || "",
    });
    
    // Reset image states when opening edit dialog
    resetImageStates();
    
    // Set current image as preview if exists
    if (tile.image_url) {
      setImagePreview(tile.image_url);
    }
    
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Panel
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tile Management</h1>
          <p className="text-gray-600">Manage your tile catalog database and QR codes</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by tile name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          {shouldShowPriceUpdateButton && (
            <Button 
              onClick={() => setIsPriceUpdateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Bulk Price Update
            </Button>
          )}
          
          <Button 
            onClick={handleDownloadTilesPDF}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="h-4 w-4" />
                Add New Tile
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Tile</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddTile)} className="space-y-4">
                {/* Basic Info Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tile Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., TH007" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tile Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Marble Classic White" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Size and Pricing Row */}
                <div className="grid grid-cols-4 gap-3">
                   <FormField
                     control={form.control}
                     name="size_length"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Height(mm)</FormLabel>
                         <FormControl>
                            <Input
                             {...field}
                             inputMode="numeric"
                             pattern="[0-9]*"
                             placeholder="600"
                             value={field.value || ""}
                             onChange={(e) => {
                               const value = e.target.value;
                               field.onChange(value === "" ? undefined : Number(value));
                             }}
                             className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="size_breadth"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Width Length(mm)</FormLabel>
                         <FormControl>
                            <Input
                             {...field}
                             inputMode="numeric"
                             pattern="[0-9]*"
                             placeholder="600"
                             value={field.value || ""}
                             onChange={(e) => {
                               const value = e.target.value;
                               field.onChange(value === "" ? undefined : Number(value));
                             }}
                             className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="price_per_box"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Price/Box</FormLabel>
                         <FormControl>
                            <Input
                             {...field}
                             inputMode="decimal"
                             pattern="[0-9]*\.?[0-9]*"
                             placeholder="450"
                             value={field.value || ""}
                             onChange={(e) => {
                               const value = e.target.value;
                               field.onChange(value === "" ? undefined : Number(value));
                             }}
                             className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="pieces_per_box"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Pieces/Box</FormLabel>
                         <FormControl>
                            <Input
                             {...field}
                             inputMode="numeric"
                             pattern="[0-9]*"
                             placeholder="4"
                             value={field.value || ""}
                             onChange={(e) => {
                               const value = e.target.value;
                               field.onChange(value === "" ? undefined : Number(value));
                             }}
                             className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>

                 {/* Category Field */}
                 <FormField
                   control={form.control}
                   name="category"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Category</FormLabel>
                       <FormControl>
                         <Input 
                           {...field} 
                           placeholder="e.g., Bathroom, Kitchen, Living Room" 
                           list="categories-list"
                         />
                       </FormControl>
                       <datalist id="categories-list">
                         {categories.map((category) => (
                           <option key={category} value={category} />
                         ))}
                       </datalist>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 {/* Image Section */}
                <div className="space-y-3">
                  <FormLabel>Tile Image</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label
                        htmlFor="image-upload-add"
                        className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-md"
                          />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                            <p className="text-xs text-gray-500">Upload Image</p>
                          </div>
                        )}
                        <input
                          id="image-upload-add"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageFileChange}
                        />
                      </label>
                      {imagePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImagePreview("");
                            setSelectedImageFile(null);
                          }}
                          className="w-full text-xs"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    {/* URL Input */}
                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Or Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createTileMutation.isPending || isUploading}
                  >
                    {isUploading ? "Uploading..." : createTileMutation.isPending ? "Adding..." : "Add Tile"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Bulk Price Update Dialog */}
      <CategoryBulkPriceUpdateDialog
        isOpen={isPriceUpdateDialogOpen}
        onClose={() => setIsPriceUpdateDialogOpen(false)}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Tile Database ({filteredTiles.length} tiles)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
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
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {tile.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tile.name}</TableCell>
                    <TableCell>
                      {tile.category && (
                        <Badge variant="outline" className="text-xs">
                          {tile.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Ruler className="h-3 w-3" />
                        {tile.size_length} × {tile.size_breadth} mm
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {tile.price_per_box && (
                          <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                            <IndianRupee className="h-4 w-4" />
                            {tile.price_per_box}/box
                          </div>
                        )}
                        {pricePerSqFt > 0 && (
                          <div className="text-xs text-gray-600">
                            ₹{pricePerSqFt.toFixed(2)}/sq ft
                          </div>
                        )}
                        {tile.pieces_per_box && (
                          <div className="text-xs text-gray-600">
                            {tile.pieces_per_box} pcs/box
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tile.qr_code_url ? (
                          <>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Generated
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadQR(tile.qr_code_url!, tile.code, tile.name)}
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
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tile</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{tile.name}" ({tile.code})? 
                                This action cannot be undone and will remove the tile from all quotations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTile(tile.id)}
                                className="bg-red-600 hover:bg-red-700"
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
              <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No tiles found</h3>
              <p className="text-gray-500">
                {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first tile"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tile</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditTile)} className="space-y-4">
              {/* Basic Info Row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tile Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., TH007" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tile Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Marble Classic White" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Size and Pricing Row */}
              <div className="grid grid-cols-4 gap-3">
                 <FormField
                   control={form.control}
                   name="size_length"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Length (mm)</FormLabel>
                       <FormControl>
                          <Input
                            {...field}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="600"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? undefined : Number(value));
                            }}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="size_breadth"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Breadth (mm)</FormLabel>
                       <FormControl>
                          <Input
                            {...field}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="600"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? undefined : Number(value));
                            }}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="price_per_box"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Price/Box</FormLabel>
                       <FormControl>
                          <Input
                            {...field}
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            placeholder="450"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? undefined : Number(value));
                            }}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="pieces_per_box"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Pieces/Box</FormLabel>
                       <FormControl>
                          <Input
                            {...field}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="4"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? undefined : Number(value));
                            }}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
               </div>

               {/* Category Field */}
               <FormField
                 control={form.control}
                 name="category"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Category</FormLabel>
                     <FormControl>
                       <Input 
                         {...field} 
                         placeholder="e.g., Bathroom, Kitchen, Living Room" 
                         list="categories-list-edit"
                       />
                     </FormControl>
                     <datalist id="categories-list-edit">
                       {categories.map((category) => (
                         <option key={category} value={category} />
                       ))}
                     </datalist>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               {/* Image Section */}
              <div className="space-y-3">
                <FormLabel>Tile Image</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label
                      htmlFor="image-upload-edit"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                          <p className="text-xs text-gray-500">Upload Image</p>
                        </div>
                      )}
                      <input
                        id="image-upload-edit"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageFileChange}
                      />
                    </label>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImagePreview("");
                          setSelectedImageFile(null);
                        }}
                        className="w-full text-xs"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  {/* URL Input */}
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Or Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateTileMutation.isPending || isUploading}
                >
                  {isUploading ? "Uploading..." : updateTileMutation.isPending ? "Updating..." : "Update Tile"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
