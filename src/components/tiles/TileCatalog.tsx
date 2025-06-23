import { useState } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useTiles } from "@/hooks/useTiles";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { useGenerateQRForTile } from "@/hooks/useTileManagement";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SearchBar } from "./SearchBar";
import { TileCard } from "./TileCard";
import { TileAssignmentDialog } from "./TileAssignmentDialog";
import { EmptyTileState } from "./EmptyTileState";

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
  const generateQRMutation = useGenerateQRForTile();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  const filteredTiles = tiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQRScanned = (tileCode: string) => {
    // Set the search term to the scanned tile code
    setSearchTerm(tileCode);
    
    // Find the tile with the scanned code
    const tile = tiles.find(t => t.code === tileCode);
    if (tile) {
      // Auto-select the tile
      setSelectedTile(tile.id);
      toast.success(`Tile "${tile.name}" (${tile.code}) found and selected`);
    } else {
      toast.error(`No tile found with code: ${tileCode}`);
    }
  };

  const handleTileSelect = (tileId: string) => {
    const wasSelected = selectedTile === tileId;
    setSelectedTile(wasSelected ? null : tileId);
    
    // If this is being used as a selector (from tile selection step), call the callback
    if (onTileSelected && !wasSelected) {
      onTileSelected(tileId);
    }
  };

  const handleGenerateQR = async (tileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await generateQRMutation.mutateAsync(tileId);
  };

  const handleDownloadQR = (qrUrl: string, tileCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${tileCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetails = (tileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/tile/${tileId}`);
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
      </div>

      <SearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onQRScanned={handleQRScanned}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTiles.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            isSelected={selectedTile === tile.id}
            isAdmin={isAdmin}
            showAssignButton={showAssignButton}
            onTileSelect={handleTileSelect}
            onGenerateQR={handleGenerateQR}
            onDownloadQR={handleDownloadQR}
            onViewDetails={handleViewDetails}
            onAssignClick={handleAssignButtonClick}
            isGeneratingQR={generateQRMutation.isPending}
          >
            {selectedTile === tile.id && showAssignButton && (
              <Dialog open={isAssignDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <div /> {/* Empty trigger since we handle opening via button click */}
                </DialogTrigger>
              </Dialog>
            )}
          </TileCard>
        ))}
      </div>

      {filteredTiles.length === 0 && !isLoading && <EmptyTileState />}

      <TileAssignmentDialog
        isOpen={isAssignDialogOpen}
        onOpenChange={handleDialogOpenChange}
        customers={customers}
        rooms={rooms}
        selectedCustomerId={selectedCustomerId}
        selectedRooms={selectedRooms}
        onCustomerChange={handleCustomerChange}
        onRoomToggle={handleRoomToggle}
        onSelectAllRooms={handleSelectAllRooms}
        onClearSelections={handleClearSelections}
        onAssignTile={handleAssignTile}
        isAssigning={saveSelectionsMutation.isPending}
      />
    </div>
  );
};
