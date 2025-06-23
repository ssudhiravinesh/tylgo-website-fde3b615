import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Grid3X3, QrCode, Ruler, IndianRupee, Plus, Users, Check } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { toast } from "sonner";

interface TileCatalogProps {
  onTileSelected?: (tileId: string) => void;
  preSelectedCustomerId?: string;
  preSelectedRoomIds?: string[];
  showAssignButton?: boolean;
}

export const TileCatalog = ({ 
  onTileSelected, 
  preSelectedCustomerId = "",
  preSelectedRoomIds = [],
  showAssignButton = true 
}: TileCatalogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preSelectedCustomerId);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(preSelectedRoomIds);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  const { data: tiles = [], isLoading } = useTiles();
  const { data: customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(selectedCustomerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();

  const filteredTiles = tiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTileSelect = (tileId: string) => {
    const wasSelected = selectedTile === tileId;
    setSelectedTile(wasSelected ? null : tileId);
    
    // If this is being used as a selector (from tile selection step), call the callback
    if (onTileSelected && !wasSelected) {
      onTileSelected(tileId);
    }
  };

  const handleAssignTile = async () => {
    if (!selectedTile || !selectedCustomerId || selectedRooms.length === 0) {
      toast.error("Please select a customer and at least one room");
      return;
    }

    // First, remove any existing selections for these rooms and this tile
    try {
      await Promise.all(
        selectedRooms.map(roomId => 
          deleteSelectionMutation.mutateAsync({ roomId, tileId: selectedTile })
        )
      );
    } catch (error) {
      // Ignore errors for non-existing selections
      console.log("Some selections didn't exist, continuing...");
    }

    // Then add the new selections
    const selectionsToSave = selectedRooms.map(roomId => ({
      customer_id: selectedCustomerId,
      room_id: roomId,
      tile_id: selectedTile
    }));

    try {
      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      toast.success(`Tile assigned to ${selectedRooms.length} room(s) successfully!`);
      // Clear room selections but keep dialog open and tile selected
      setSelectedRooms([]);
    } catch (error) {
      console.error("Error assigning tile:", error);
      toast.error("Failed to assign tile to rooms");
    }
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleSelectAllRooms = () => {
    if (selectedRooms.length === rooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map(room => room.id));
    }
  };

  const handleClearSelections = () => {
    setSelectedRooms([]);
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedRooms([]); // Clear room selections when customer changes
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAssignDialogOpen(open);
    if (!open) {
      // Only clear room selections when dialog closes, keep tile and customer selection
      setSelectedRooms([]);
    }
  };

  const handleAssignButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAssignDialogOpen(true);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tile Catalog</h1>
          <p className="text-gray-600">Browse, search, and assign tiles to customer rooms</p>
        </div>
        
        {showAssignButton && (
          <Button variant="outline" className="gap-2">
            <QrCode className="h-4 w-4" />
            Scan QR Code
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by tile name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTiles.map((tile) => (
          <Card 
            key={tile.id} 
            className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 ${
              selectedTile === tile.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
            }`}
            onClick={() => handleTileSelect(tile.id)}
          >
            <CardContent className="p-4">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                {tile.image_url ? (
                  <img 
                    src={tile.image_url} 
                    alt={tile.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Grid3X3 className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {tile.code}
                  </Badge>
                  {selectedTile === tile.id && (
                    <Badge className="bg-blue-600 text-white text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">
                  {tile.name}
                </h3>
                
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Ruler className="h-3 w-3" />
                  {tile.size_length} × {tile.size_breadth} mm
                </div>
                
                <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                  <IndianRupee className="h-4 w-4" />
                  {tile.price_per_sqm}/m²
                </div>

                {selectedTile === tile.id && showAssignButton && (
                  <Dialog open={isAssignDialogOpen} onOpenChange={handleDialogOpenChange}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="w-full mt-2 gap-2"
                        onClick={handleAssignButtonClick}
                      >
                        <Plus className="h-4 w-4" />
                        Assign to Rooms
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Assign Tile to Customer Rooms
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Select Customer</label>
                          <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a customer..." />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedCustomerId && rooms.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium">Select Rooms</label>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleSelectAllRooms}
                                  className="h-7 text-xs"
                                >
                                  {selectedRooms.length === rooms.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                {selectedRooms.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearSelections}
                                    className="h-7 text-xs"
                                  >
                                    Clear
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                              {rooms.map((room) => (
                                <div key={room.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                  <Checkbox
                                    id={room.id}
                                    checked={selectedRooms.includes(room.id)}
                                    onCheckedChange={() => handleRoomToggle(room.id)}
                                  />
                                  <label htmlFor={room.id} className="text-sm flex-1 cursor-pointer">
                                    <span className="font-medium">{room.name}</span>
                                    <span className="text-gray-500 ml-2">
                                      ({(room.length * room.width).toFixed(2)} {room.unit}²)
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {selectedRooms.length} of {rooms.length} rooms selected
                            </div>
                          </div>
                        )}

                        {selectedCustomerId && rooms.length === 0 && (
                          <p className="text-sm text-gray-500 py-4 text-center">
                            No rooms found for this customer. Please add rooms first.
                          </p>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsAssignDialogOpen(false)}
                            className="flex-1"
                          >
                            Close
                          </Button>
                          <Button 
                            onClick={handleAssignTile}
                            disabled={!selectedCustomerId || selectedRooms.length === 0 || saveSelectionsMutation.isPending}
                            className="flex-1"
                          >
                            {saveSelectionsMutation.isPending ? 'Assigning...' : 'Assign Tile'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTiles.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No tiles found</h3>
          <p className="text-gray-500">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};
