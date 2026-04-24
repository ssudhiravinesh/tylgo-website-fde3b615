import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, User, Phone, MapPin, Calendar, IndianRupee, Download, Calculator, Package, Layers, Footprints } from "lucide-react";
import { formatDimensions, formatArea, calculateAreaInSquareFeet, Unit } from "@/utils/unitConversions";
import { useUnifiedPDFGeneration } from '@/hooks/useUnifiedPDFGeneration';
import { useQuotationItems, useUpdateQuotationItem } from '@/hooks/useQuotationItems';
import type { Quotation } from "@/hooks/useQuotations";
import { toast } from "sonner";
import { GridLoader } from "@/components/ui/GridLoader";
import {
  calculateFromQuotationItems,
  type ItemCalcResult,
  type TileCalcResult,
  type ProductCalcResult,
} from "@/utils/calculations/quotationItemCalculator";

interface QuotationDetailsProps {
  quotation: Quotation;
  onBack: () => void;
}

export const QuotationDetails = ({ quotation, onBack }: QuotationDetailsProps) => {
  const { generateQuotationPDF, isGenerating } = useUnifiedPDFGeneration();
  const { data: quotationItems = [], isLoading: isLoadingItems } = useQuotationItems(quotation.id);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-muted text-foreground";
    }
  };

  const formatTileSize = (sizeLength?: number, sizeBreadth?: number) => {
    if (!sizeLength || !sizeBreadth) return 'N/A';
    return `${sizeLength} × ${sizeBreadth} mm`;
  };

  // Delegate all calculation to the unified calculator
  const wastagePercentage = quotation.wastage_percentage || 0;
  const { calculations, mrp } = calculateFromQuotationItems(quotationItems, wastagePercentage);
  const discountPercentage = quotation.discount_percentage || 0;
  const discountAmount = quotation.discount_amount || ((mrp * discountPercentage) / 100);
  const grandTotal = mrp - discountAmount;


  const handleDownloadPDF = () => {
    // Transform quotation items to match the expected interface
    const transformedQuotationItems = quotationItems.map(item => ({
      ...item,
      // Ensure tile_id is present if required by the target type, defaulting to empty string if missing (e.g. for products)
      tile_id: item.tile_id || '',
      tile: item.tile ? {
        id: item.tile_id || '',
        code: item.tile.code,
        size_length: item.tile.size_length,
        size_breadth: item.tile.size_breadth,
        price_per_box: item.tile.price_per_box || 0,
        pieces_per_box: item.tile.pieces_per_box || 0,
        image_url: item.tile.image_url,
        category: item.tile.category
      } : undefined,
      room: item.room ? {
        id: item.room_id,
        name: item.room.name,
        length: item.room.length,
        width: item.room.width,
        unit: item.room.unit,
        measurements: item.room.measurements
      } : undefined,
      product: item.product ? {
        id: item.product.id,
        name: item.product.name,
        code: item.product.code || '',
        image_url: item.product.image_url,
        price: item.product.price
      } : undefined
    }));

    generateQuotationPDF({ ...quotation, quotation_items: transformedQuotationItems });
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
            <h1 className="text-2xl font-bold text-foreground">
              Quotation {quotation.quotation_number}
            </h1>
            <p className="text-muted-foreground">View quotation details and items</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Quotation Header */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
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
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Customer Information
              </h3>
              <div className="space-y-3 pl-7">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{quotation.customer?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
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
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <span className="text-sm">{formatted}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Quotation Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Quotation Information
              </h3>
              <div className="space-y-3 pl-7">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Created by: {quotation.worker?.name}</span>
                </div>
                <div className="space-y-2">
                  {discountPercentage > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          MRP: ₹{mrp.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">
                          Discount ({discountPercentage}%): -₹{discountAmount.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-lg text-green-600">
                      Total: ₹{grandTotal > 0 ? grandTotal.toLocaleString() : (quotation.total_cost || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-foreground mb-2">Notes:</h4>
              <p className="text-muted-foreground text-sm">{quotation.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tile Calculations */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Tile Calculations ({wastagePercentage}% wastage included)
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoadingItems ? (
            <GridLoader className="min-h-[200px]" loadingText="Loading quotation items..." />
          ) : calculations.length > 0 ? (
            <div className="space-y-4">
              {/* Tile Calculations Section */}
              {calculations.some(c => c.type === 'tile') && (
                <div className="space-y-4 mb-8">
                  <h3 className="font-semibold text-lg text-foreground border-b pb-2">Tiles & Rooms</h3>
                  {calculations.filter(c => c.type === 'tile').map((calc) => {
                    const tile = (calc as TileCalcResult).tile;
                    // Tile Render
                    return (
                      <div key={calc.tile.id} className="border rounded-lg p-4 bg-muted">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{calc.tile.code}</h4>
                            <p className="text-sm text-muted-foreground font-medium mb-1">{calc.tile.category}</p>
                            <p className="text-sm text-muted-foreground">Size: {formatTileSize(calc.tile.size_length, calc.tile.size_breadth)}</p>
                            <div className="text-xs text-muted-foreground space-y-1 mt-1">
                              {(() => {
                                // Display Rooms if any
                                if (calc.rooms.length > 0) {
                                  // 1. Get all items associated with this specific tile
                                  const tileItems = quotationItems?.filter(item => item.tile_id === calc.tile.id && item.room_id) || [];

                                  // 2. Group layers by Room Name using a Map to preserve order and uniqueness
                                  const roomLayerMap = new Map<string, number[]>();

                                  tileItems.forEach(item => {
                                    const roomName = item.room?.name;
                                    if (!roomName) return;

                                    if (!roomLayerMap.has(roomName)) {
                                      roomLayerMap.set(roomName, []);
                                    }

                                    // Add layer if it exists and isn't already in the list for this room
                                    if (item.layer_number !== null && item.layer_number !== undefined) {
                                      const layers = roomLayerMap.get(roomName);
                                      if (layers && !layers.includes(item.layer_number)) {
                                        layers.push(item.layer_number);
                                      }
                                    }
                                  });

                                  // 3. Extract the ordered lists
                                  const uniqueRoomNames = Array.from(roomLayerMap.keys());

                                  // Create the layer string groups corresponding to the room order
                                  const layerGroups = uniqueRoomNames.map(name => {
                                    const layers = roomLayerMap.get(name)?.sort((a, b) => a - b) || [];
                                    return layers.length > 0 ? `(${layers.join(', ')})` : null;
                                  }).filter(Boolean);

                                  return (
                                    <div className="mb-1">
                                      {uniqueRoomNames.length > 0 && (
                                        <div>
                                          <p className="font-medium text-muted-foreground">Rooms:</p>
                                          <ul className="list-disc list-inside text-xs text-muted-foreground ml-1">
                                            {tileItems.map((item, idx) => {
                                              if (!item.room) return null;
                                              // Use a unique key combining room id and index
                                              return (
                                                <li key={`${item.room.name}-${idx}`}>
                                                  {item.room.name}
                                                  {item.room.measurements && item.room.measurements.length > 0 ? (
                                                    <div className="ml-2 mt-1 space-y-0.5">
                                                      {item.room.measurements.map((m: any, mIdx: number) => (
                                                        <div key={mIdx} className="text-[10px] text-muted-foreground">
                                                          Shape {mIdx + 1}: {parseFloat(m.length).toFixed(2)} × {parseFloat(m.width).toFixed(2)} {item.room.unit}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <span className="text-muted-foreground/70 ml-1">
                                                      ({formatDimensions(item.room.length, item.room.width, item.room.unit as Unit)})
                                                    </span>
                                                  )}
                                                  {item.layer_number && ` - L${item.layer_number}`}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      )}
                                      {layerGroups.length > 0 && (
                                        <p className="mt-1"><span className="font-medium text-muted-foreground">Layers Summary:</span> {layerGroups.join(', ')}</p>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Display Staircases if any */}
                              {calc.staircases.length > 0 && (
                                <div className="flex flex-wrap gap-2 items-center text-orange-700">
                                  <div className="flex items-center gap-1">
                                    <Footprints className="h-3 w-3" />
                                    <span className="font-medium">Staircases:</span>
                                  </div>
                                  {calc.staircases.map((s, idx) => (
                                    <span key={idx} className="bg-orange-50 px-1.5 py-0.5 rounded text-xs border border-orange-200">
                                      {s.name} ({s.type === 'step' ? 'Steps' : 'Risers'})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Size: {formatTileSize(calc.tile.size_length, calc.tile.size_breadth)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {/* Show Total Area only if there are rooms involved */}
                          {calc.totalArea > 0 && (
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-muted-foreground/70" />
                              <div>
                                <p className="text-muted-foreground">Total Area</p>
                                <p className="font-medium">{calc.totalArea.toFixed(2)} sq ft</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-muted-foreground">Tiles Required</p>
                              <p className="font-medium text-green-600">
                                {calc.tilesNeeded} tiles
                                {(() => {
                                  const leftoverTiles = calc.tilesNeeded % (calc.tile.pieces_per_box || 1);
                                  const fullBoxes = Math.floor(calc.tilesNeeded / (calc.tile.pieces_per_box || 1));
                                  return (
                                    <span className="text-xs text-muted-foreground block">
                                      ({fullBoxes} box{fullBoxes !== 1 ? 'es' : ''}{leftoverTiles > 0 ? ` and ${leftoverTiles} tile${leftoverTiles > 1 ? 's' : ''}` : ''})
                                      <br />(+{wastagePercentage}% wastage)
                                    </span>
                                  );
                                })()}
                              </p>

                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-muted-foreground">Boxes Needed</p>
                              <p className="font-medium text-primary">{calc.boxesNeeded}</p>
                              {(() => {
                                const tileItem = quotationItems?.find(item => item.tile_id === calc.tile.id);
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
                              <p className="text-muted-foreground">Total Cost</p>
                              <p className="font-bold text-purple-600">₹{calc.totalPrice.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Product Calculations Section */}
              {calculations.some(c => c.type === 'product') && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-foreground border-b pb-2">Product Selection</h3>
                  {calculations.filter(c => c.type === 'product').map((calc) => {
                    const productCalc = calc as ProductCalcResult;
                    return (
                      <div key={productCalc.product.id} className="border rounded-lg p-4 bg-muted border-blue-100">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{productCalc.product.name}</h4>
                            <p className="text-sm text-muted-foreground">Code: {productCalc.product.code || 'N/A'}</p>
                            <div className="text-xs text-primary font-medium mt-1">Product Selection</div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">₹{productCalc.totalPrice.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">₹{productCalc.product.price?.toLocaleString()} / unit</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 bg-card rounded border border-border px-3">
                          <div>
                            <span className="text-xs text-muted-foreground block">Quantity</span>
                            <span className="font-medium text-sm">{productCalc.quantity} units</span>
                          </div>
                          <div className="col-span-2"></div>
                          <div>
                            <span className="text-xs text-muted-foreground block">Total</span>
                            <span className="font-medium text-sm">₹{productCalc.totalPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Grand Total:</span>
                  <span className="text-xl font-bold text-green-600">₹{grandTotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All calculations include {wastagePercentage}% wastage allowance
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
              <p className="text-muted-foreground">No items found in this quotation</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
};
