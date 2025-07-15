import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, User, Phone, MapPin, Calendar, IndianRupee, Calculator, Package, Layers, Save, Minus, Plus } from "lucide-react";
import { formatDimensions, formatArea, calculateAreaInSquareFeet, Unit } from "@/utils/unitConversions";
import { useQuotations, type Quotation } from "@/hooks/useQuotations";
import { useQuotationItems, useUpdateQuotationItem } from "@/hooks/useQuotationItems";
import { toast } from "sonner";

interface EditQuotationPageProps {
  quotation: Quotation;
  onBack: () => void;
  onSuccess?: () => void;
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
  customBoxes?: number; // For manual adjustment
}

export const EditQuotationPage = ({ quotation, onBack, onSuccess }: EditQuotationPageProps) => {
  const { updateQuotation, isUpdating } = useQuotations();
  const { mutate: updateQuotationItem } = useUpdateQuotationItem();
  
  const [quotationNumber, setQuotationNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [wastagePercentage, setWastagePercentage] = useState(0);
  const [customBoxAdjustments, setCustomBoxAdjustments] = useState<{ [tileId: string]: number }>({});

  useEffect(() => {
    if (quotation) {
      setQuotationNumber(quotation.quotation_number);
      setStatus(quotation.status || "draft");
      setNotes(quotation.notes || "");
      setWastagePercentage(quotation.wastage_percentage || 0);
      
      // Initialize custom box adjustments from stored data
      const storedAdjustments: { [tileId: string]: number } = {};
      quotation.quotation_items?.forEach(item => {
        if (item.custom_boxes && item.custom_boxes !== 0) {
          storedAdjustments[item.tile_id] = item.custom_boxes;
        }
      });
      setCustomBoxAdjustments(storedAdjustments);
    }
  }, [quotation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTileSize = (sizeLength?: number, sizeBreadth?: number) => {
    if (!sizeLength || !sizeBreadth) return 'N/A';
    
    const lengthInMm = sizeLength;
    const widthInMm = sizeBreadth;
    
    if (lengthInMm >= 1000 || widthInMm >= 1000) {
      const lengthInM = (lengthInMm / 1000).toFixed(2);
      const widthInM = (widthInMm / 1000).toFixed(2);
      return `${lengthInM} × ${widthInM} m`;
    } else if (lengthInMm >= 100 || widthInMm >= 100) {
      const lengthInCm = (lengthInMm / 10).toFixed(1);
      const widthInCm = (widthInMm / 10).toFixed(1);
      return `${lengthInCm} × ${widthInCm} cm`;
    } else {
      return `${lengthInMm} × ${widthInMm} mm`;
    }
  };

  const calculateTileRequirements = (): { calculations: TileCalculation[]; wastagePercentage: number } => {
    const tileCalculations: { [tileId: string]: TileCalculation } = {};
    const currentWastagePercentage = wastagePercentage || 0;

    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      quotation.quotation_items.forEach((item) => {
        const tileId = item.tile_id;
        const room = item.room;
        const tile = item.tile;
        
        if (!tileCalculations[tileId] && tile) {
          tileCalculations[tileId] = {
            tile,
            rooms: [],
            totalArea: 0,
            tilesNeeded: 0,
            boxesNeeded: 0,
            totalPrice: 0
          };
        }

        if (room && tileCalculations[tileId]) {
          const roomAreaInSqFt = parseFloat(item.area?.toString()) || 0;
          tileCalculations[tileId].rooms.push(room);
          tileCalculations[tileId].totalArea += roomAreaInSqFt;
        }
      });

      Object.values(tileCalculations).forEach(calc => {
        const tile = calc.tile;
        
        if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
          const pricePerBox = parseFloat(tile.price_per_box.toString());
          const piecesPerBox = parseInt(tile.pieces_per_box.toString());
          
          if (!isNaN(pricePerBox) && !isNaN(piecesPerBox) && piecesPerBox > 0) {
            const tileLengthFt = (tile.size_length || 0) / 304.8;
            const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
            const tileAreaSqFt = tileLengthFt * tileBreadthFt;
            
            if (tileAreaSqFt > 0) {
              // 1. Compute raw tiles needed (area + wastage)
              const basicTiles = calc.totalArea / tileAreaSqFt;
              const rawTilesNeeded = Math.ceil(basicTiles * (1 + currentWastagePercentage / 100));
              
              // 2. Compute boxes you’ll actually order
              const boxesNeeded = Math.ceil(rawTilesNeeded / piecesPerBox);
              
              // 3. Compute conceptual breakdown
              const fullBoxes = Math.floor(rawTilesNeeded / piecesPerBox);
              const leftoverTiles = rawTilesNeeded % piecesPerBox;
              
              // 4. Assign into your calc object
              calc.tilesNeeded   = rawTilesNeeded;    // raw count (7)
              calc.boxesNeeded   = boxesNeeded;       // ordered boxes (3)
              calc.customBoxes   = customBoxAdjustments[tile.id] || 0;
              calc.totalPrice    = boxesNeeded * pricePerBox;
              calc.fullBoxes     = fullBoxes;         // for UI breakdown
              calc.leftoverTiles = leftoverTiles;     // for UI breakdown
            }
          }
        }
      });
    }

    return {
      calculations: Object.values(tileCalculations),
      wastagePercentage: currentWastagePercentage
    };
  };

  const { calculations } = calculateTileRequirements();
  const grandTotal = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  const adjustBoxes = (tileId: string, delta: number) => {
    setCustomBoxAdjustments(prev => ({
      ...prev,
      [tileId]: (prev[tileId] || 0) + delta
    }));
  };
  const isClosed = quotation.status === 'closed';
  const handleSave = async () => {
    try {
      await updateQuotation({
        id: quotation.id,
        quotation_number: quotationNumber,
        status,
        notes: notes || undefined,
        wastage_percentage: wastagePercentage,
        total_cost: grandTotal,
      });

      // Update quotation items with new prices and custom box adjustments
      for (const calc of calculations) {
        const quotationItemsForTile = quotation.quotation_items?.filter(item => item.tile_id === calc.tile.id) || [];
        const pricePerBox = parseFloat(calc.tile.price_per_box?.toString() || '0');
        const customBoxAdjustment = customBoxAdjustments[calc.tile.id] || 0;
        
        if (quotationItemsForTile.length > 0) {
          // Distribute the total price proportionally across all items for this tile
          const totalBoxesForTile = calc.boxesNeeded;
          const pricePerItem = (totalBoxesForTile * pricePerBox) / quotationItemsForTile.length;
          
          for (const item of quotationItemsForTile) {
            await updateQuotationItem({
              id: item.id,
              total_price: pricePerItem,
              custom_boxes: customBoxAdjustment
            });
          }
        }
      }

      toast.success('Quotation updated successfully');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast.error('Failed to update quotation');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Edit Quotation {quotation.quotation_number}
            </h1>
            <p className="text-gray-600">Modify quotation details and tile quantities</p>
          </div>
        </div>
    
        <Button
          onClick={handleSave}
          disabled={isUpdating || isClosed}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      {isClosed && (
        <div className="bg-red-50 text-red-800 p-2 rounded-md border border-red-200">
          This quotation is marked as <strong>closed</strong> and cannot be edited.
        </div>
      )}

      {/* Quotation Header with Edit Fields */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Quotation Details
            </CardTitle>
            <Badge className={`text-sm capitalize ${getStatusColor(status)}`}>
              {status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Customer Information
              </h3>
              <div className="space-y-3 pl-7">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{quotation.customer?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{quotation.customer?.mobile}</span>
                </div>
                {quotation.customer?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <span className="text-sm">{quotation.customer.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quotation Information with Edit Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Quotation Information
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
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

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                  <IndianRupee className="h-5 w-5" />
                  <span>Total: ₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
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

      {/* Tile Calculations with Edit Controls */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Tile Calculations ({wastagePercentage}% wastage included)
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {calculations.length > 0 ? (
            <div className="space-y-4">
              {calculations.map((calc) => (
                <div key={calc.tile.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800">{calc.tile.name}</h4>
                      <p className="text-sm text-gray-600">Code: {calc.tile.code}</p>
                      <div className="text-xs text-gray-500">
                        <p>
                          Rooms: {calc.rooms.map(r => r.name).join(', ')}
                        </p>
                        {(() => {
                          const tileItems = quotation.quotation_items?.filter(item => item.tile_id === calc.tile.id) || [];
                          const layerNumbers = Array.from(new Set(tileItems.map(item => item.layer_number).filter(layer => layer !== null && layer !== undefined)));
                          
                          if (layerNumbers.length > 0) {
                            return (
                              <p>
                                Layers: {layerNumbers.sort((a, b) => a - b).join(', ')}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-gray-500">
                        Size: {formatTileSize(calc.tile.size_length, calc.tile.size_breadth)}
                      </p>
                    </div>
                  </div>
                
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600">Total Area</p>
                        <p className="font-medium">{calc.totalArea.toFixed(2)} sq ft</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-gray-600">Tiles Required</p>
                        <p className="font-medium text-green-600">
                          {calc.tilesNeeded} tiles
                            <span className="text-xs text-gray-500 block">
                              ({calc.fullBoxes} box{calc.fullBoxes !== 1 ? 'es' : ''}
                              {calc.leftoverTiles > 0
                                ? ` and ${calc.leftoverTiles} tile${calc.leftoverTiles !== 1 ? 's' : ''}`
                                : ''})
                              <br />
                              (+{wastagePercentage}% wastage)
                              <br />
                              Order {calc.boxesNeeded} box{calc.boxesNeeded !== 1 ? 'es' : ''} (for {calc.boxesNeeded * calc.tile.pieces_per_box} tiles)
                            </span>
                            );
                          })()}
                        </p>

                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-gray-600">Boxes Needed</p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustBoxes(calc.tile.id, -1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-medium text-blue-600 min-w-[3rem] text-center">
                            {calc.boxesNeeded}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustBoxes(calc.tile.id, 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {calc.customBoxes !== 0 && (
                          <p className="text-xs text-orange-600">
                            {calc.customBoxes > 0 ? '+' : ''}{calc.customBoxes} manual adjustment
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-gray-600">Total Cost</p>
                        <p className="font-bold text-purple-600">₹{calc.totalPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-800">Grand Total:</span>
                  <span className="text-xl font-bold text-green-600">₹{grandTotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  All calculations include {wastagePercentage}% wastage allowance
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No items found in this quotation</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
