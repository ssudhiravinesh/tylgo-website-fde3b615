import { useState } from "react";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { TileAssignmentDialog } from "./TileAssignmentDialog";
import { TileCatalog } from "./TileCatalog";
import type { Tile } from "@/hooks/useTiles";

interface TileManagementProps {
  userRole: "admin" | "worker" | "super_admin";
}

export const TileManagement = ({ userRole }: TileManagementProps) => {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const { data: customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(selectedCustomerId);

  const handleAssignClick = (tile: Tile) => {
    setSelectedTile(tile);
    setShowAssignmentDialog(true);
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

    // Since TileAssignmentDialog mainly handles UI but doesn't persist itself? 
    // Wait, TileAssignmentDialog in original code just toasted success but didn't actually call a mutation.
    // Let's preserve that behavior or check if mutations were missing.
    // The original code:
    // toast.success(`Tile "${selectedTile.code}" assigned to ${selectedRooms.length} room(s)`);
    // setShowAssignmentDialog(false);
    //
    // So for now we keep it as UI prototype unless mutation exists.

    toast.success(`Tile "${selectedTile.code}" assigned to ${selectedRooms.length} room(s)`);
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
      {/* 
          We reuse TileCatalog for the main view. 
          This gives us the Category View, Search, and Filtering for free!
      */}
      <TileCatalog
        isSelectionMode={true} // Enables selection behavior (clicking tile opens details or selects)
        // Actually, isSelectionMode=true in TileCatalog triggers onTileSelect.
        // If onTileSelect is NOT provided, it opens details.
        // We want "Assign" button to show up.
        onAssignTile={handleAssignClick}
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
