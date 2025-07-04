import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TileCalculationsCard } from "@/components/rooms/TileCalculationsCard";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import { toast } from "sonner";
import { useCreateQuotation } from "@/hooks/useQuotations";
import { useAuth } from "@/hooks/useAuth";
import type { Customer } from "@/hooks/useCustomers";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface QuotationFormProps {
  customer: Customer;
  rooms: Room[];
  tiles: Tile[];
  tileSelections: { [roomId: string]: string[] };
  wallTileSelections: { [roomId: string]: { [layerNumber: number]: string } };
  wastagePercentage: number;
  onSuccess: () => void;
}

interface TileCalculation {
  tile: {
    id: string;
    name: string;
    code: string;
    price_per_box?: number;
    pieces_per_box?: number;
    size_length: number;
    size_breadth: number;
  };
  rooms: Array<{
    id: string;
    name: string;
    length: number;
    width: number;
    unit: string;
  }>;
  totalArea: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
  isWallTile?: boolean;
  wallLayers?: number[];
}

export const QuotationForm = ({
  customer,
  rooms,
  tiles,
  tileSelections,
  wallTileSelections,
  wastagePercentage,
  onSuccess,
}: QuotationFormProps) => {
  const [quotationNumber, setQuotationNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const { user } = useAuth();
  
  const createQuotationMutation = useCreateQuotation();

  // Calculate tile requirements with dynamic wastage
  const calculations = useMemo(() => {
    const tileCalculations: TileCalculation[] = [];

    // Process floor tiles
    const floorTileGroups: { [tileId: string]: { rooms: Room[]; totalArea: number } } = {};

    rooms.forEach((room) => {
      if (room.room_type === 'floor' && tileSelections[room.id]) {
        tileSelections[room.id].forEach((tileId) => {
          if (!floorTileGroups[tileId]) {
            floorTileGroups[tileId] = { rooms: [], totalArea: 0 };
          }
          floorTileGroups[tileId].rooms.push(room);
          floorTileGroups[tileId].totalArea += calculateAreaInSquareFeet(room.length, room.width, room.unit);
        });
      }
    });

    Object.entries(floorTileGroups).forEach(([tileId, group]) => {
      const tile = tiles.find(t => t.id === tileId);
      if (tile && tile.price_per_box && tile.pieces_per_box && tile.size_length && tile.size_breadth) {
        const tileLengthFt = tile.size_length / 304.8;
        const tileBreadthFt = tile.size_breadth / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          const basicTilesNeeded = Math.ceil(group.totalArea / tileAreaSqFt);
          const tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
          const boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
          const totalPrice = boxesNeeded * tile.price_per_box;

          tileCalculations.push({
            tile: {
              id: tile.id,
              name: tile.name,
              code: tile.code,
              price_per_box: tile.price_per_box,
              pieces_per_box: tile.pieces_per_box,
              size_length: tile.size_length,
              size_breadth: tile.size_breadth,
            },
            rooms: group.rooms.map(room => ({
              id: room.id,
              name: room.name,
              length: room.length,
              width: room.width,
              unit: room.unit,
            })),
            totalArea: group.totalArea,
            tilesNeeded,
            boxesNeeded,
            totalPrice,
            isWallTile: false,
          });
        }
      }
    });

    // Process wall tiles
    const wallTileGroups: { [tileId: string]: { 
      rooms: Room[]; 
      totalArea: number; 
      layers: number[];
      tilesPerLayer: number;
    } } = {};

    Object.entries(wallTileSelections).forEach(([roomId, layerSelections]) => {
      const room = rooms.find(r => r.id === roomId);
      if (room && room.room_type === 'wall') {
        Object.entries(layerSelections).forEach(([layerStr, tileId]) => {
          if (tileId) {
            const layerNumber = parseInt(layerStr);
            if (!wallTileGroups[tileId]) {
              wallTileGroups[tileId] = { 
                rooms: [], 
                totalArea: 0, 
                layers: [],
                tilesPerLayer: 0
              };
            }
            
            // Add room if not already added
            if (!wallTileGroups[tileId].rooms.find(r => r.id === room.id)) {
              wallTileGroups[tileId].rooms.push(room);
            }
            
            wallTileGroups[tileId].layers.push(layerNumber);
            
            // Calculate area for this layer (same for each layer since wall dimensions are constant)
            const layerArea = calculateAreaInSquareFeet(
              room.wall_length || room.length, 
              room.wall_height || room.width, 
              room.unit
            );
            wallTileGroups[tileId].totalArea += layerArea;
          }
        });
      }
    });

    Object.entries(wallTileGroups).forEach(([tileId, group]) => {
      const tile = tiles.find(t => t.id === tileId);
      if (tile && tile.price_per_box && tile.pieces_per_box && tile.size_length && tile.size_breadth) {
        const tileLengthFt = tile.size_length / 304.8;
        const tileBreadthFt = tile.size_breadth / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          const basicTilesNeeded = Math.ceil(group.totalArea / tileAreaSqFt);
          const tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
          const boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
          const totalPrice = boxesNeeded * tile.price_per_box;

          tileCalculations.push({
            tile: {
              id: tile.id,
              name: tile.name,
              code: tile.code,
              price_per_box: tile.price_per_box,
              pieces_per_box: tile.pieces_per_box,
              size_length: tile.size_length,
              size_breadth: tile.size_breadth,
            },
            rooms: group.rooms.map(room => ({
              id: room.id,
              name: room.name,
              length: room.length,
              width: room.width,
              unit: room.unit,
            })),
            totalArea: group.totalArea,
            tilesNeeded,
            boxesNeeded,
            totalPrice,
            isWallTile: true,
            wallLayers: [...new Set(group.layers)].sort((a, b) => a - b),
          });
        }
      }
    });

    return tileCalculations;
  }, [rooms, tiles, tileSelections, wallTileSelections, wastagePercentage]);

  const grandTotal = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quotationNumber.trim()) {
      toast.error("Please enter a quotation number");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to create a quotation");
      return;
    }

    if (calculations.length === 0) {
      toast.error("Please select tiles for at least one room");
      return;
    }

    if (wastagePercentage === 0) {
      toast.error("Please enter a wastage percentage");
      return;
    }

    try {
      const quotationData = {
        quotation_number: quotationNumber.trim(),
        customer_id: customer.id,
        worker_id: user.id,
        status,
        notes: notes.trim() || null,
        total_cost: grandTotal,
        wastage_percentage: wastagePercentage,
      };

      const quotationItems = [];

      // Add floor tile items
      Object.entries(tileSelections).forEach(([roomId, tileIds]) => {
        const room = rooms.find(r => r.id === roomId);
        if (room && room.room_type === 'floor') {
          tileIds.forEach((tileId) => {
            const tile = tiles.find(t => t.id === tileId);
            if (tile && tile.price_per_box) {
              const roomArea = calculateAreaInSquareFeet(room.length, room.width, room.unit);
              const tileCalc = calculations.find(c => c.tile.id === tileId && !c.isWallTile);
              quotationItems.push({
                room_id: roomId,
                tile_id: tileId,
                area: roomArea,
                price_per_box: tile.price_per_box,
                total_price: tileCalc?.totalPrice || 0,
              });
            }
          });
        }
      });

      // Add wall tile items
      Object.entries(wallTileSelections).forEach(([roomId, layerSelections]) => {
        const room = rooms.find(r => r.id === roomId);
        if (room && room.room_type === 'wall') {
          Object.entries(layerSelections).forEach(([layerStr, tileId]) => {
            if (tileId) {
              const tile = tiles.find(t => t.id === tileId);
              if (tile && tile.price_per_box) {
                const layerArea = calculateAreaInSquareFeet(
                  room.wall_length || room.length, 
                  room.wall_height || room.width, 
                  room.unit
                );
                const tileCalc = calculations.find(c => c.tile.id === tileId && c.isWallTile);
                quotationItems.push({
                  room_id: roomId,
                  tile_id: tileId,
                  area: layerArea,
                  price_per_box: tile.price_per_box,
                  total_price: tileCalc?.totalPrice || 0,
                });
              }
            }
          });
        }
      });

      await createQuotationMutation.mutateAsync({
        ...quotationData,
        items: quotationItems,
      });

      toast.success("Quotation created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error creating quotation:", error);
      toast.error("Failed to create quotation. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <TileCalculationsCard 
        calculations={calculations} 
        grandTotal={grandTotal}
        wastagePercentage={wastagePercentage}
      />

      <Card>
        <CardHeader>
          <CardTitle>Create Quotation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quotation-number">Quotation Number *</Label>
                <Input
                  id="quotation-number"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  placeholder="QUO-001"
                  required
                />
              </div>

              <div>
                <Label htmlFor="wastage">Wastage Percentage *</Label>
                <Input
                  id="wastage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={wastagePercentage}
                  placeholder="Enter wastage %"
                  disabled
                  readOnly
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Total Cost</Label>
                <Input value={`₹${grandTotal.toLocaleString()}`} disabled />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or specifications..."
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createQuotationMutation.isPending}
            >
              {createQuotationMutation.isPending ? "Creating..." : "Create Quotation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
