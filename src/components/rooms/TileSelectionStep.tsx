
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { TileSelectionCard } from "./TileSelectionCard";
import { WallTileSelector } from "./WallTileSelector";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { TileAssignmentDialog } from "@/components/tiles/TileAssignmentDialog";
import { 
  useRoomTileSelections, 
  useSaveRoomTileSelections, 
  useDeleteRoomTileSelection 
} from "@/hooks/useRooms";
import type { Customer } from "@/hooks/useCustomers";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface TileSelectionStepProps {
  customer: Customer;
  rooms: Room[];
  tiles: Tile[];
}

interface WallTileSelection {
  [roomId: string]: {
    [layerNumber: number]: string; // tileId for each layer
  };
}

export const TileSelectionStep = ({ customer, rooms, tiles }: TileSelectionStepProps) => {
  const [tileSelections, setTileSelections] = useState<{ [roomId: string]: string[] }>({});
  const [wallTileSelections, setWallTileSelections] = useState<WallTileSelection>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [wastagePercentage, setWastagePercentage] = useState<number>(0);

  const { data: existingSelections = [] } = useRoomTileSelections(customer.id);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();

  // Load existing selections
  useEffect(() => {
    if (existingSelections.length > 0) {
      const floorSelections: { [roomId: string]: string[] } = {};
      const wallSelections: WallTileSelection = {};

      existingSelections.forEach((selection) => {
        const room = rooms.find(r => r.id === selection.room_id);
        
        if (room?.room_type === 'floor') {
          if (!floorSelections[selection.room_id]) {
            floorSelections[selection.room_id] = [];
          }
          if (!floorSelections[selection.room_id].includes(selection.tile_id)) {
            floorSelections[selection.room_id].push(selection.tile_id);
          }
        } else if (room?.room_type === 'wall' && selection.layer_number !== null) {
          if (!wallSelections[selection.room_id]) {
            wallSelections[selection.room_id] = {};
          }
          wallSelections[selection.room_id][selection.layer_number] = selection.tile_id;
        }
      });

      setTileSelections(floorSelections);
      setWallTileSelections(wallSelections);
    }
  }, [existingSelections, rooms]);

  const floorRooms = rooms.filter(room => room.room_type === 'floor');
  const wallRooms = rooms.filter(room => room.room_type === 'wall');

  const handleChooseTile = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsDialogOpen(true);
  };

  const handleTileSelect = (tileId: string) => {
    setTileSelections(prev => ({
      ...prev,
      [selectedRoomId]: [...(prev[selectedRoomId] || []), tileId]
    }));
    setIsDialogOpen(false);
  };

  const handleRemoveTile = async (roomId: string, tileId: string) => {
    try {
      await deleteSelectionMutation.mutateAsync({ roomId, tileId });
      setTileSelections(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter(id => id !== tileId)
      }));
      toast.success("Tile selection removed");
    } catch (error) {
      console.error("Error removing tile:", error);
      toast.error("Failed to remove tile selection");
    }
  };

  const handleSaveSelections = async () => {
    try {
      const selectionsToSave = [];

      // Add floor tile selections
      Object.entries(tileSelections).forEach(([roomId, tileIds]) => {
        tileIds.forEach(tileId => {
          selectionsToSave.push({
            customer_id: customer.id,
            room_id: roomId,
            tile_id: tileId,
          });
        });
      });

      // Add wall tile selections
      Object.entries(wallTileSelections).forEach(([roomId, layerSelections]) => {
        Object.entries(layerSelections).forEach(([layerStr, tileId]) => {
          if (tileId) {
            selectionsToSave.push({
              customer_id: customer.id,
              room_id: roomId,
              tile_id: tileId,
              layer_number: parseInt(layerStr),
            });
          }
        });
      });

      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      toast.success("Tile selections saved successfully!");
    } catch (error) {
      console.error("Error saving selections:", error);
      toast.error("Failed to save selections");
    }
  };

  const hasSelections = Object.keys(tileSelections).length > 0 || Object.keys(wallTileSelections).length > 0;

  if (showQuotationForm) {
    return (
      <div>
        <Button 
          onClick={() => setShowQuotationForm(false)} 
          variant="outline" 
          className="mb-4"
        >
          ← Back to Tile Selection
        </Button>
        <QuotationForm
          customer={customer}
          rooms={rooms}
          tiles={tiles}
          tileSelections={tileSelections}
          wallTileSelections={wallTileSelections}
          onSuccess={() => {
            setShowQuotationForm(false);
            toast.success("Quotation created successfully!");
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Tiles for {customer.name}'s Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Choose tiles for each room. You can select multiple tiles per room.
          </p>
          
          <div className="mb-4">
            <Label htmlFor="wastage-input" className="text-sm font-medium">
              Wastage Percentage (%) *
            </Label>
            <Input
              id="wastage-input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={wastagePercentage}
              onChange={(e) => setWastagePercentage(Number(e.target.value))}
              placeholder="Enter wastage percentage"
              className="w-48 mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Floor Rooms */}
      {floorRooms.length > 0 && (
        <TileSelectionCard
          rooms={floorRooms}
          tiles={tiles}
          tileSelections={tileSelections}
          onChooseTile={handleChooseTile}
          onRemoveTile={handleRemoveTile}
          isDeleting={deleteSelectionMutation.isPending}
        />
      )}

      {/* Wall Rooms */}
      {wallRooms.length > 0 && (
        <WallTileSelector
          wallRooms={wallRooms}
          tiles={tiles}
          wallTileSelections={wallTileSelections}
          onWallTileSelectionChange={setWallTileSelections}
        />
      )}

      {/* Action Buttons - Moved to bottom */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end mt-8 pt-6 border-t">
        <Button
          onClick={handleSaveSelections}
          disabled={!hasSelections || saveSelectionsMutation.isPending}
          variant="outline"
        >
          {saveSelectionsMutation.isPending ? "Saving..." : "Save Tile Selections"}
        </Button>
        
        <Button
          onClick={() => setShowQuotationForm(true)}
          disabled={!hasSelections || wastagePercentage === 0}
        >
          Generate Quotation
        </Button>
      </div>

      <TileAssignmentDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customers={[]}
        rooms={[]}
        selectedCustomerId=""
        selectedRooms={[]}
        onCustomerChange={() => {}}
        onRoomToggle={() => {}}
        onSelectAllRooms={() => {}}
        onClearSelections={() => {}}
        onAssignTile={() => {}}
        isAssigning={false}
      />
    </div>
  );
};
