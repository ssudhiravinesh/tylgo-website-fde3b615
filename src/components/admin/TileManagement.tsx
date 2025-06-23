
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, Plus, Grid3X3, Ruler, IndianRupee, ArrowLeft, QrCode, Download } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useCreateTile, useUpdateTile, useDeleteTile, useGenerateQRForTile } from "@/hooks/useTileManagement";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const tileSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  size_length: z.number().min(1, "Length must be greater than 0"),
  size_breadth: z.number().min(1, "Breadth must be greater than 0"),
  price_per_sqm: z.number().min(0, "Price must be 0 or greater"),
  image_url: z.string().optional(),
});

type TileFormData = z.infer<typeof tileSchema>;

interface TileManagementProps {
  onBack: () => void;
}

export const TileManagement = ({ onBack }: TileManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTile, setEditingTile] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: tiles = [], isLoading } = useTiles();
  const createTileMutation = useCreateTile();
  const updateTileMutation = useUpdateTile();
  const deleteTileMutation = useDeleteTile();
  const generateQRMutation = useGenerateQRForTile();

  const form = useForm<TileFormData>({
    resolver: zodResolver(tileSchema),
    defaultValues: {
      code: "",
      name: "",
      size_length: 0,
      size_breadth: 0,
      price_per_sqm: 0,
      image_url: "",
    },
  });

  const filteredTiles = tiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTile = (data: TileFormData) => {
    // Ensure all required fields are present and convert image_url to proper format
    const tileData = {
      code: data.code,
      name: data.name,
      size_length: data.size_length,
      size_breadth: data.size_breadth,
      price_per_sqm: data.price_per_sqm,
      image_url: data.image_url || null,
    };
    
    createTileMutation.mutate(tileData, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        form.reset();
      },
    });
  };

  const handleEditTile = (data: TileFormData) => {
    if (editingTile) {
      const updateData = {
        id: editingTile.id,
        code: data.code,
        name: data.name,
        size_length: data.size_length,
        size_breadth: data.size_breadth,
        price_per_sqm: data.price_per_sqm,
        image_url: data.image_url || null,
      };
      
      updateTileMutation.mutate(updateData, {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingTile(null);
          form.reset();
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

  const handleDownloadQR = (qrUrl: string, tileCode: string) => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${tileCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEditDialog = (tile: any) => {
    setEditingTile(tile);
    form.reset({
      code: tile.code,
      name: tile.name,
      size_length: tile.size_length,
      size_breadth: tile.size_breadth,
      price_per_sqm: tile.price_per_sqm,
      image_url: tile.image_url || "",
    });
    setIsEditDialogOpen(true);
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
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              Add New Tile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Tile</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddTile)} className="space-y-4">
                
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
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="size_length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (mm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="600"
                            onChange={(e) => field.onChange(Number(e.target.value))}
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
                            type="number"
                            placeholder="600"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="price_per_sqm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per m²</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="450.00"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    disabled={createTileMutation.isPending}
                  >
                    {createTileMutation.isPending ? "Adding..." : "Add Tile"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      
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
                <TableHead>Size</TableHead>
                <TableHead>Price/m²</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTiles.map((tile) => (
                <TableRow key={tile.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {tile.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{tile.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Ruler className="h-3 w-3" />
                      {tile.size_length} × {tile.size_breadth} mm
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-semibold text-green-600">
                      <IndianRupee className="h-4 w-4" />
                      {tile.price_per_sqm}
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
              ))}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tile</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditTile)} className="space-y-4">
              
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
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="size_length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Length (mm)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="600"
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                          type="number"
                          placeholder="600"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="price_per_sqm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per m²</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="450.00"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  disabled={updateTileMutation.isPending}
                >
                  {updateTileMutation.isPending ? "Updating..." : "Update Tile"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
