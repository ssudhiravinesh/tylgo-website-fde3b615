
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User, FileText } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useCreateQuotation } from "@/hooks/useQuotations";
import { useAuth } from "@/hooks/useAuth";
import { useRoomsByCustomer } from "@/hooks/useRooms";
import { useTiles } from "@/hooks/useTiles";
import { toast } from "sonner";

interface QuotationFormProps {
  preSelectedCustomerId?: string;
  selectedRoomsData?: Array<{
    roomId: string;
    tileId: string;
    quantity: number;
    wastagePercentage: number;
    isWallTile?: boolean;
    layerNumber?: number;
  }>;
  wastagePercentage?: number;
  onBack: () => void;
  onSuccess: () => void;
}

export const QuotationForm = ({ 
  preSelectedCustomerId, 
  selectedRoomsData = [], 
  wastagePercentage = 10,
  onBack, 
  onSuccess 
}: QuotationFormProps) => {
  const { user } = useAuth();
  const { data: customers = [] } = useCustomers();
  const { data: rooms = [] } = useRoomsByCustomer(preSelectedCustomerId || '');
  const { data: tiles = [] } = useTiles();
  const createQuotationMutation = useCreateQuotation();

  const [customerId, setCustomerId] = useState(preSelectedCustomerId || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate quotation number based on timestamp
  const generateQuotationNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    return `QT${year}${month}${day}${time}`;
  };

  const [quotationNumber] = useState(generateQuotationNumber());

  // Calculate total from selected rooms data
  const calculateTotal = () => {
    if (!selectedRoomsData.length) return 0;

    let total = 0;
    selectedRoomsData.forEach(roomData => {
      const tile = tiles.find(t => t.id === roomData.tileId);
      if (tile && tile.price_per_box && tile.pieces_per_box && tile.size_length && tile.size_breadth) {
        // Calculate tile area in square feet
        const tileLengthFt = (tile.size_length || 0) / 304.8; // mm to ft
        const tileBreadthFt = (tile.size_breadth || 0) / 304.8; // mm to ft
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          // Step 1: Calculate basic tiles needed for the area
          const basicTilesNeeded = Math.ceil(roomData.quantity / tileAreaSqFt);
          
          // Step 2: Add wastage percentage to tiles
          const tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
          
          // Step 3: Calculate boxes needed from total tiles
          const boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
          
          // Step 4: Calculate total price
          const totalPrice = boxesNeeded * tile.price_per_box;
          total += totalPrice;
        }
      }
    });
    return total;
  };

  const totalCost = calculateTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to create quotations");
      return;
    }

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (!selectedRoomsData.length) {
      toast.error("No room data provided");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare quotation items
      const quotationItems = selectedRoomsData.map(roomData => {
        const tile = tiles.find(t => t.id === roomData.tileId);
        if (!tile) {
          throw new Error(`Tile not found for ID: ${roomData.tileId}`);
        }

        // Calculate pricing
        let totalPrice = 0;
        if (tile.price_per_box && tile.pieces_per_box && tile.size_length && tile.size_breadth) {
          const tileLengthFt = (tile.size_length || 0) / 304.8;
          const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
          const tileAreaSqFt = tileLengthFt * tileBreadthFt;
          
          if (tileAreaSqFt > 0) {
            const basicTilesNeeded = Math.ceil(roomData.quantity / tileAreaSqFt);
            const tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
            const boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
            totalPrice = boxesNeeded * tile.price_per_box;
          }
        }

        return {
          tile_id: roomData.tileId,
          room_id: roomData.roomId,
          area: roomData.quantity, // Original area without wastage
          price_per_box: tile.price_per_box || 0,
          total_price: totalPrice,
        };
      });

      const quotationData = {
        quotation_number: quotationNumber,
        customer_id: customerId,
        worker_id: user.id,
        total_cost: totalCost,
        status: 'draft',
        notes: notes || undefined,
        wastage_percentage: wastagePercentage,
        items: quotationItems,
      };

      console.log('Creating quotation with data:', quotationData);
      await createQuotationMutation.mutateAsync(quotationData);
      onSuccess();
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error('Failed to create quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Generate Quotation</h2>
          <p className="text-gray-600">Create a quotation for the selected tiles and rooms</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer and Quotation Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer & Quotation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quotation-number">Quotation Number</Label>
              <Input
                id="quotation-number"
                value={quotationNumber}
                readOnly
                className="bg-gray-50"
              />
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">{selectedCustomer.name}</h4>
                <p className="text-sm text-blue-600">{selectedCustomer.mobile}</p>
                {selectedCustomer.address && (
                  <p className="text-xs text-blue-500 mt-1">{selectedCustomer.address}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes for this quotation..."
                rows={3}
              />
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 mb-1">Wastage Percentage: {wastagePercentage}%</p>
              <p className="text-lg font-bold text-green-800">
                Total Amount: ₹{totalCost.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quotation Items Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quotation Items ({selectedRoomsData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedRoomsData.map((roomData, index) => {
                const room = rooms.find(r => r.id === roomData.roomId);
                const tile = tiles.find(t => t.id === roomData.tileId);
                
                return (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium">{room?.name || 'Unknown Room'}</h5>
                        <p className="text-sm text-gray-600">{tile?.name || 'Unknown Tile'}</p>
                        <p className="text-xs text-gray-500">
                          Area: {roomData.quantity.toFixed(2)} sq ft
                          {roomData.isWallTile && roomData.layerNumber && (
                            <span> (Layer {roomData.layerNumber})</span>
                          )}
                        </p>
                        <p className="text-xs text-blue-600">
                          {roomData.isWallTile ? 'Wall Tile' : 'Floor Tile'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !customerId || !selectedRoomsData.length}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Creating...' : 'Create Quotation'}
        </Button>
      </div>
    </div>
  );
};
