
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, FileText, User, Calculator } from "lucide-react";
import { useQuotations, type Quotation } from "@/hooks/useQuotations";
import { toast } from "sonner";

interface EditQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onSuccess?: () => void;
}

export const EditQuotationDialog = ({ isOpen, onClose, quotation, onSuccess }: EditQuotationDialogProps) => {
  const { updateQuotation, isUpdating } = useQuotations();
  
  const [quotationNumber, setQuotationNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [wastagePercentage, setWastagePercentage] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);

  useEffect(() => {
    if (quotation) {
      setQuotationNumber(quotation.quotation_number);
      setStatus(quotation.status || "draft");
      setNotes(quotation.notes || "");
      setWastagePercentage(quotation.wastage_percentage || 0);
      setDiscountPercentage(quotation.discount_percentage || 0);
    }
  }, [quotation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quotation) return;

    try {
      const discountAmount = (grandTotal * discountPercentage) / 100;
      const finalTotal = grandTotal - discountAmount;
      
      await updateQuotation({
        id: quotation.id,
        quotation_number: quotationNumber,
        status,
        notes: notes || undefined,
        wastage_percentage: wastagePercentage,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        total_cost: finalTotal,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast.error('Failed to update quotation');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    if (quotation) {
      setQuotationNumber(quotation.quotation_number);
      setStatus(quotation.status || "draft");
      setNotes(quotation.notes || "");
      setWastagePercentage(quotation.wastage_percentage || 0);
      setDiscountPercentage(quotation.discount_percentage || 0);
    }
  };

  const calculateTotals = () => {
    if (!quotation?.quotation_items) return { totalBoxes: 0, grandTotal: 0 };
    
    let totalBoxes = 0;
    let grandTotal = 0;
    
    // Group by tile to calculate proper totals
    const tileCalculations: { [tileId: string]: { boxes: number; total: number } } = {};
    
    quotation.quotation_items.forEach(item => {
      if (!tileCalculations[item.tile_id]) {
        tileCalculations[item.tile_id] = { boxes: 0, total: 0 };
      }
      
      // Calculate based on actual stored values
      const tile = item.tile;
      const area = parseFloat(item.area?.toString()) || 0;
      
      if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
        const tileLengthFt = (tile.size_length || 0) / 304.8;
        const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          const basicTilesNeeded = Math.ceil(area / tileAreaSqFt);
          const tilesWithWastage = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
          const boxes = Math.ceil(tilesWithWastage / tile.pieces_per_box);
          const total = boxes * parseFloat(tile.price_per_box.toString());
          
          tileCalculations[item.tile_id].boxes += boxes;
          tileCalculations[item.tile_id].total += total;
        }
      }
    });
    
    Object.values(tileCalculations).forEach(calc => {
      totalBoxes += calc.boxes;
      grandTotal += calc.total;
    });
    
    return { totalBoxes, grandTotal };
  };

  const { totalBoxes, grandTotal } = calculateTotals();
  const discountAmount = (grandTotal * discountPercentage) / 100;
  const finalTotal = grandTotal - discountAmount;

  if (!quotation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit Quotation {quotation.quotation_number}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quotation Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Quotation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="quotation-number">Quotation Number</Label>
                  <Input
                    id="quotation-number"
                    value={quotationNumber}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
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
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wastage">Wastage Percentage (%)</Label>
                  <Input
                    id="wastage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={wastagePercentage}
                    onChange={(e) => setWastagePercentage(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer & Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer & Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800">{quotation.customer?.name}</h4>
                  <p className="text-sm text-blue-600">{quotation.customer?.mobile}</p>
                  {quotation.customer?.address && (
                    <p className="text-xs text-blue-500 mt-1">{quotation.customer.address}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{quotation.quotation_items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Boxes:</span>
                    <span className="font-medium">{totalBoxes}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">MRP:</span>
                    <span className="font-medium">₹{grandTotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="discount">Discount Percentage (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                      placeholder="Enter discount %"
                    />
                  </div>
                  
                  {discountPercentage > 0 && (
                    <div className="flex justify-between items-center text-sm text-red-600">
                      <span>Discount Amount:</span>
                      <span className="font-medium">-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-gray-700 font-medium">Grand Total:</span>
                    <span className="font-bold text-lg text-green-600">₹{finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(quotation.created_at).toLocaleDateString()}</p>
                  <p>Created by: {quotation.worker?.name}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
