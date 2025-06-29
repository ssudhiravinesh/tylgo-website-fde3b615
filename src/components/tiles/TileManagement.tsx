
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, IndianRupee, Grid3X3, Ruler, Check, Plus, QrCode, Download } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useGenerateQRForTile } from "@/hooks/useTileManagement";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { QRScanner } from "@/components/qr/QRScanner";
import { TileAssignmentDialog } from "./TileAssignmentDialog";
import { TileDetailsDialog } from "./TileDetailsDialog";
import { SearchBar } from "./SearchBar";
import { TileCard } from "./TileCard";
import { EmptyTileState } from "./EmptyTileState";
import { toast } from "sonner";
import type { Tile } from "@/hooks/useTiles";

interface TileManagementProps {
  userRole: "admin" | "worker";
}

export const TileManagement = ({ userRole }: TileManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [showTileDetails, setShowTileDetails] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [generatingQRTileId, setGeneratingQRTileId] = useState<string | null>(null);

  const { data: tiles = [], isLoading } = useTiles();
  const { data: customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(selectedCustomerId);
  const generateQRMutation = useGenerateQRForTile();

  const filteredTiles = tiles.filter(tile =>
    tile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQRScanned = (tileCode: string) => {
    const tile = tiles.find(t => t.code === tileCode);
    if (tile) {
      setSelectedTile(tile);
      setShowAssignmentDialog(true);
    } else {
      toast.error(`No tile found with code: ${tileCode}`);
    }
  };

  const handleTileSelect = (tile: Tile) => {
    setSelectedTile(tile);
  };

  const handleViewDetails = (tileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tile = tiles.find(t => t.id === tileId);
    if (tile) {
      setSelectedTile(tile);
      setShowTileDetails(true);
    }
  };

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTile) {
      setShowAssignmentDialog(true);
    }
  };

  const handleGenerateQR = async (tileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratingQRTileId(tileId);
    try {
      await generateQRMutation.mutateAsync(tileId);
    } catch (error) {
      console.error('Error generating QR:', error);
    } finally {
      setGeneratingQRTileId(null);
    }
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

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedRooms([]);
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

  const handleAssignTile = () => {
    if (!selectedTile || !selectedCustomerId || selectedRooms.length === 0) {
      toast.error("Please select a customer and at least one room");
      return;
    }

    // Here you would typically save the tile assignments
    toast.success(`Tile "${selectedTile.name}" assigned to ${selectedRooms.length} room(s)`);
    setShowAssignmentDialog(false);
    setSelectedCustomerId("");
    setSelectedRooms([]);
  };

  const handleCloseAssignmentDialog = () => {
    setShowAssignmentDialog(false);
    setSelectedCustomerId("");
    setSelectedRooms([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tile Catalog</h1>
          <p className="text-gray-600 mt-1">Browse and manage tiles</p>
        </div>
      </div>

      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onQRScanned={handleQRScanned}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTiles.length === 0 ? (
        <EmptyTileState searchTerm={searchTerm} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTiles.map((tile) => (
            <TileCard
              key={tile.id}
              tile={tile}
              isSelected={selectedTile?.id === tile.id}
              isAdmin={userRole === "admin"}
              showAssignButton={selectedTile?.id === tile.id}
              onTileSelect={() => handleTileSelect(tile)}
              onGenerateQR={handleGenerateQR}
              onDownloadQR={handleDownloadQR}
              onViewDetails={handleViewDetails}
              onAssignClick={handleAssignClick}
              isGeneratingQR={generatingQRTileId === tile.id}
            />
          ))}
        </div>
      )}

      {/* Tile Details Dialog */}
      <TileDetailsDialog
        tile={selectedTile}
        isOpen={showTileDetails}
        onClose={() => {
          setShowTileDetails(false);
          setSelectedTile(null);
        }}
        userRole={userRole}
      />

      {/* Tile Assignment Dialog */}
      <TileAssignmentDialog
        isOpen={showAssignmentDialog}
        onOpenChange={handleCloseAssignmentDialog}
        customers={customers}
        rooms={rooms}
        selectedCustomerId={selectedCustomerId}
        selectedRooms={selectedRooms}
        onCustomerChange={handleCustomerChange}
        onRoomToggle={handleRoomToggle}
        onSelectAllRooms={handleSelectAllRooms}
        onClearSelections={handleClearSelections}
        onAssignTile={handleAssignTile}
        isAssigning={false}
      />
    </div>
  );
};
