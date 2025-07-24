import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, User, Phone, MapPin, Calendar, IndianRupee, Download, Calculator, Package, Layers } from "lucide-react";
import { formatDimensions, formatArea, calculateAreaInSquareFeet, Unit } from "@/utils/unitConversions";
import { usePDFGeneration } from "@/hooks/usePDFGeneration";
import type { Quotation } from "@/hooks/useQuotations";

interface QuotationDetailsProps {
  quotation: Quotation;
  onBack: () => void;
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
}

export const QuotationDetails = ({ quotation, onBack }: QuotationDetailsProps) => {
  const { generateQuotationPDF } = usePDFGeneration();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
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

  // Use unified calculation system from tileCalculations.ts
  const calculateTileRequirements = (): { calculations: TileCalculation[]; wastagePercentage: number } => {
    const tileCalculations: { [tileId: string]: TileCalculation } = {};
    const wastagePercentage = quotation.wastage_percentage || 0; // Use stored wastage percentage, default to 0

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
          // Use the stored area from the quotation item (original area without wastage)
          const roomAreaInSqFt = parseFloat(item.area?.toString()) || 0;
          
          tileCalculations[tileId].rooms.push(room);
          tileCalculations[tileId].totalArea += roomAreaInSqFt;
        }
      });

      // Use the same unified calculation logic
      Object.values(tileCalculations).forEach(calc => {
        const tile = calc.tile;
        
        if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
          const pricePerBox = parseFloat(tile.price_per_box.toString());
          const piecesPerBox = parseInt(tile.pieces_per_box.toString());
          
          if (!isNaN(pricePerBox) && !isNaN(piecesPerBox) && piecesPerBox > 0) {
            // Convert tile dimensions from mm to feet (unified logic)
            const tileLengthFt = (tile.size_length || 0) / 304.8;
            const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
            const tileAreaSqFt = tileLengthFt * tileBreadthFt;
            
            if (tileAreaSqFt > 0) {
              // Step 1: Calculate basic tiles needed for the area
              const basicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
              
              // Step 2: Add wastage percentage to tiles
              calc.tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
              
               // Step 3: Calculate boxes needed from total tiles with custom adjustments
               const baseBoxes = Math.ceil(calc.tilesNeeded / piecesPerBox);
               
               // Get custom box adjustment from the first item for this tile
               const tileItem = quotation.quotation_items?.find(item => item.tile_id === tile.id);
               const customBoxAdjustment = tileItem?.custom_boxes || 0;
               
               calc.boxesNeeded = Math.max(0, baseBoxes + customBoxAdjustment);
               
               // Update tiles needed to reflect actual boxes being purchased
               if (customBoxAdjustment !== 0) {
                 calc.tilesNeeded = calc.boxesNeeded * piecesPerBox;
               }
               
              // Step 4: Calculate total price based on current box count (same as edit page)
              calc.totalPrice = calc.boxesNeeded * pricePerBox;
            }
          }
        }
      });
    }

    return {
      calculations: Object.values(tileCalculations),
      wastagePercentage
    };
  };

  const { calculations, wastagePercentage } = calculateTileRequirements();
  const grandTotal = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);

  const handleDownloadPDF = () => {
    generateQuotationPDF(quotation);
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
              Quotation {quotation.quotation_number}
            </h1>
            <p className="text-gray-600">View quotation details and items</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDownloadPDF}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Quotation Header */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Quotation Details
            </CardTitle>
            <Badge className={`text-sm capitalize ${getStatusColor(quotation.status)}`}>
              {quotation.status}
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
                {(() => {
                  const customer = quotation.customer as any;
                  if (!customer) return null;
                  
                  const parts = [];
                  if (customer.area) parts.push(customer.area);
                  if (customer.state) parts.push(customer.state);
                  
                  let formatted = parts.join(", ");
                  if (customer.pincode) {
                    formatted += formatted ? ` - ${customer.pincode}` : customer.pincode;
                  }
                  
                  return formatted ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                      <span className="text-sm">{formatted}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Quotation Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Quotation Information
              </h3>
              <div className="space-y-3 pl-7">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Created by: {quotation.worker?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-gray-500" />
                  <span className="font-bold text-lg text-green-600">
                    Total: ₹{grandTotal > 0 ? grandTotal.toLocaleString() : (quotation.total_cost || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-800 mb-2">Notes:</h4>
              <p className="text-gray-600 text-sm">{quotation.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tile Calculations */}
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
                          // Get layer information for this tile from quotation items
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
                      </div>
                      <p className="text-xs text-gray-500">
                        Size: {formatTileSize(calc.tile.size_length, calc.tile.size_breadth)}
                      </p>
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
                          {(() => {
                            const leftoverTiles = calc.tilesNeeded % (calc.tile.pieces_per_box || 1);
                            const fullBoxes = Math.floor(calc.tilesNeeded / (calc.tile.pieces_per_box || 1));
                            return (
                              <span className="text-xs text-gray-500 block">
                                ({fullBoxes} box{fullBoxes !== 1 ? 'es' : ''}{leftoverTiles > 0 ? ` and ${leftoverTiles} tile${leftoverTiles > 1 ? 's' : ''}` : ''})
                                <br />(+{wastagePercentage}% wastage)
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
                        <p className="font-medium text-blue-600">{calc.boxesNeeded}</p>
                        {(() => {
                          const tileItem = quotation.quotation_items?.find(item => item.tile_id === calc.tile.id);
                          const customBoxAdjustment = tileItem?.custom_boxes || 0;
                          if (customBoxAdjustment !== 0) {
                            return (
                              <p className="text-xs text-orange-600">
                                {customBoxAdjustment > 0 ? '+' : ''}{customBoxAdjustment} manual adjustment
                              </p>
                            );
                          }
                          return null;
                        })()}
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
