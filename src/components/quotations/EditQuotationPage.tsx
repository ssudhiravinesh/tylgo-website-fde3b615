import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, User, Phone, MapPin, Calendar, IndianRupee, Calculator, Package, Layers, Save, Minus, Plus, ArrowDown, Footprints } from "lucide-react";
import { formatDimensions, formatArea, calculateAreaInSquareFeet, Unit } from "@/utils/unitConversions";
import { useQuotations, type Quotation } from "@/hooks/useQuotations";
import { useQuotationItems, useUpdateQuotationItem } from "@/hooks/useQuotationItems";
import { toast } from "sonner";
import { GridLoader } from "@/components/ui/GridLoader";

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
  staircases: Array<{
    id: string;
    name: string;
    type: 'step' | 'riser';
    quantity: number;
  }>;
  totalArea: number;
  rawTilesNeeded: number;
  tilesNeeded: number;
  fullBoxes: number;
  leftoverTiles: number;
  boxesNeeded: number;
  totalPrice: number;
  discountedPricePerBox?: number; // Price/box after discount (Math.round)
  discountedTotalPrice?: number;  // Total after per-tile discount
  customBoxes?: number; // For manual adjustment
}

export const EditQuotationPage = ({ quotation, onBack, onSuccess }: EditQuotationPageProps) => {
  const { updateQuotation, isUpdating } = useQuotations();
  const { mutate: updateQuotationItem } = useUpdateQuotationItem();
  const { profile } = useAuth();
  const isManager = profile?.role === 'admin' || profile?.role === 'super_admin';
  const { data: quotationItems = [], isLoading: isLoadingItems } = useQuotationItems(quotation.id);

  const [quotationNumber, setQuotationNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [wastagePercentage, setWastagePercentage] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [roundOffAmount, setRoundOffAmount] = useState<number>(0);
  const [customBoxAdjustments, setCustomBoxAdjustments] = useState<{ [tileId: string]: number }>({});

  useEffect(() => {
    if (quotation) {
      setQuotationNumber(quotation.quotation_number);
      setStatus(quotation.status || "draft");
      setNotes(quotation.notes || "");
      setWastagePercentage(quotation.wastage_percentage?.toString() || "");
      setDiscountPercentage(quotation.discount_percentage?.toString() || "");
      setRoundOffAmount(quotation.round_off_amount || 0);

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
        return "bg-muted text-foreground";
    }
  };

  const formatTileSize = (sizeLength?: number, sizeBreadth?: number) => {
    if (!sizeLength || !sizeBreadth) return 'N/A';
    return `${sizeLength} × ${sizeBreadth} mm`;
  };

  const calculateTileRequirements = (): { calculations: TileCalculation[]; wastagePercentage: number } => {
    const tileCalculations: { [tileId: string]: TileCalculation } = {};
    const currentWastagePercentage = parseFloat(wastagePercentage) || 0;

    if (quotationItems && quotationItems.length > 0) {
      quotationItems.forEach((item) => {
        const tileId = item.tile_id;
        const room = item.room;
        const staircase = item.staircase;
        const tile = item.tile;

        if (!tileCalculations[tileId] && tile) {
          tileCalculations[tileId] = {
            tile: {
              id: tileId,
              name: tile.code,
              code: tile.code,
              price_per_box: tile.price_per_box,
              pieces_per_box: tile.pieces_per_box,
              size_length: tile.size_length,
              size_breadth: tile.size_breadth
            },
            rooms: [],
            staircases: [],
            totalArea: 0,
            rawTilesNeeded: 0,
            tilesNeeded: 0,
            fullBoxes: 0,
            leftoverTiles: 0,
            boxesNeeded: 0,
            totalPrice: 0
          };
        }

        if (tileCalculations[tileId]) {
          // Handle Room Item
          if (room && item.room_id) {
            const roomAreaInSqFt = parseFloat(item.area?.toString()) || 0;
            tileCalculations[tileId].rooms.push({
              id: item.room_id,
              name: room.name,
              length: room.length,
              width: room.width,
              unit: room.unit
            });
            tileCalculations[tileId].totalArea += roomAreaInSqFt;
          }
          // Handle Staircase Item
          else if (staircase && item.staircase_id) {
            tileCalculations[tileId].staircases.push({
              id: item.staircase_id,
              name: staircase.name,
              type: (item.tile_type as 'step' | 'riser') || 'step',
              quantity: item.quantity || 0
            });
          }
        }
      });

      Object.values(tileCalculations).forEach(calc => {
        const tile = calc.tile;

        if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
          const pricePerBox = parseFloat(tile.price_per_box.toString());
          const piecesPerBox = parseInt(tile.pieces_per_box.toString());

          if (!isNaN(pricePerBox) && !isNaN(piecesPerBox) && piecesPerBox > 0) {

            // --- 1. Calculate for ROOMS (Area Based) ---
            let roomTilesNeeded = 0;
            let roomBasicTilesNeeded = 0;
            if (calc.totalArea > 0) {
              const tileLengthFt = (tile.size_length || 0) / 304.8;
              const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
              const tileAreaSqFt = tileLengthFt * tileBreadthFt;

              if (tileAreaSqFt > 0) {
                roomBasicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
                roomTilesNeeded = Math.ceil(roomBasicTilesNeeded * (1 + (currentWastagePercentage / 100)));
              }
            }

            // --- 2. Calculate for STAIRCASES (Quantity Based) ---
            let staircaseTilesNeeded = 0;
            if (calc.staircases.length > 0) {
              // Staircase items store pre-calculated quantity which IS RAW (confirmed by analysis).
              // We need to apply wastage effectively.
              const rawStaircaseTiles = calc.staircases.reduce((sum, s) => sum + s.quantity, 0);
              staircaseTilesNeeded = Math.ceil(rawStaircaseTiles * (1 + (currentWastagePercentage / 100)));

              // Add raw staircase tiles to rawTilesNeeded for display consistency
              // (Although rawTilesNeeded usually refers to area-based raw, adding raw count here makes sense)
              roomBasicTilesNeeded += rawStaircaseTiles;
            }

            // --- 3. Combine ---
            calc.rawTilesNeeded = roomBasicTilesNeeded;
            calc.tilesNeeded = roomTilesNeeded + staircaseTilesNeeded;

            // Calculate box breakdown
            // Important: Use tilesNeeded for box calculation
            calc.fullBoxes = Math.floor(calc.tilesNeeded / piecesPerBox);
            calc.leftoverTiles = calc.tilesNeeded % piecesPerBox;

            // Apply custom box adjustments
            const baseBoxes = Math.ceil(calc.tilesNeeded / piecesPerBox);
            const adjustment = customBoxAdjustments[tile.id] || 0;
            calc.boxesNeeded = Math.max(0, baseBoxes + adjustment);
            calc.customBoxes = adjustment;

            // Update tiles needed based on actual boxes (for display purposes)
            calc.tilesNeeded = calc.boxesNeeded * piecesPerBox;

            // Recalculate total price based on current box count
            calc.totalPrice = calc.boxesNeeded * pricePerBox;

            // Calculate per-tile discounted prices
            const currentDiscount = parseFloat(discountPercentage) || 0;
            if (currentDiscount > 0) {
              calc.discountedPricePerBox = Math.round(pricePerBox * (1 - currentDiscount / 100));
              calc.discountedTotalPrice = calc.boxesNeeded * calc.discountedPricePerBox;
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
  const mrp = calculations.reduce((sum, calc) => sum + calc.totalPrice, 0);
  const discountPercent = parseFloat(discountPercentage) || 0;
  // Grand total: sum of per-tile discounted totals (or MRP totals if no discount)
  const grandTotal = discountPercent > 0
    ? calculations.reduce((sum, calc) => sum + (calc.discountedTotalPrice ?? calc.totalPrice), 0)
    : mrp;
  const discountAmount = mrp - grandTotal;
  const finalTotal = grandTotal - roundOffAmount;

  const adjustBoxes = (tileId: string, delta: number) => {
    setCustomBoxAdjustments(prev => ({
      ...prev,
      [tileId]: (prev[tileId] || 0) + delta
    }));
  };

  // --- Round Off Logic (simple ₹10 step deduction) ---
  const handleRoundOff = () => {
    if (grandTotal <= 0) return;

    const currentFinal = grandTotal - roundOffAmount;
    // Floor to nearest 10
    const target = Math.floor(currentFinal / 10) * 10;
    // If already at a 10-boundary, step down another 10
    const newTarget = (Math.abs(currentFinal - target) < 1) ? target - 10 : target;
    if (newTarget < 0) return;

    setRoundOffAmount(grandTotal - newTarget);
  };
  // ------------------------------------
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleSave = async () => {
    // Enforce: workers cannot save discounts
    const effectiveDiscountPercent = isManager ? discountPercent : 0;
    const effectiveDiscountAmount = isManager ? discountAmount : 0;
    const effectiveGrandTotal = isManager ? (mrp - effectiveDiscountAmount) : mrp;
    const effectiveFinalTotal = effectiveGrandTotal - roundOffAmount;

    try {
      await updateQuotation({
        id: quotation.id,
        quotation_number: quotationNumber,
        status,
        notes: notes || undefined,
        wastage_percentage: parseFloat(wastagePercentage) || 0,
        discount_percentage: effectiveDiscountPercent,
        discount_amount: effectiveDiscountAmount,
        round_off_amount: roundOffAmount,
        total_cost: effectiveFinalTotal,
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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-2 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 flex sm:hidden shrink-0"
            >
              <Save className="h-4 w-4" />
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>

          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground line-clamp-1">
              Edit {quotation.quotation_number}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">Modify details and quantities</p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className="hidden sm:flex gap-2 bg-primary hover:bg-primary/90 shrink-0"
        >
          <Save className="h-4 w-4" />
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Quotation Header with Edit Fields */}
      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Quotation Details
            </CardTitle>
            <Badge className={`text-xs sm:text-sm capitalize ${getStatusColor(status)}`}>
              {status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Customer Information
              </h3>
              <div className="space-y-2 sm:space-y-3 pl-6 sm:pl-7 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="font-medium">{quotation.customer?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span>{quotation.customer?.mobile}</span>
                </div>
                {quotation.customer?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-1" />
                    <span className="text-xs sm:text-sm">{quotation.customer.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quotation Information with Edit Fields */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Quotation Information
              </h3>
              <div className="space-y-3 text-sm sm:text-base">
                <div>
                  <Label htmlFor="status">Status</Label>
                  {isManager ? (
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
                  ) : (
                    <Badge className={`mt-1 text-sm capitalize ${getStatusColor(status)}`}>
                      {status}
                    </Badge>
                  )}
                </div>

                <div>
                  <Label htmlFor="wastage">Wastage Percentage (%)</Label>
                  <Input
                    id="wastage"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="15" // UPDATED: Upper bound 15
                    step="0.1"
                    placeholder="0"
                    value={wastagePercentage}
                    onChange={(e) => setWastagePercentage(e.target.value)}
                    onFocus={handleInputFocus} // UPDATED: Select all on focus
                  />
                  <p className="text-[10px] text-muted-foreground/70 mt-1">Max: 15%</p>
                </div>

                {isManager ? (
                  <div>
                    <Label htmlFor="discount">Discount Percentage (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      value={discountPercentage}
                      onChange={(e) => { setDiscountPercentage(e.target.value); setRoundOffAmount(0); }}
                      onFocus={handleInputFocus}
                    />
                  </div>
                ) : discountPercent > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    <span>Discount: {discountPercent}%</span>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-muted-foreground/70" />
                  <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                  <IndianRupee className="h-5 w-5" />
                  <span>Total: ₹{finalTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Tile Calculations{parseFloat(wastagePercentage) > 0 ? ` (${parseFloat(wastagePercentage)}% wastage)` : ''}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoadingItems ? (
            <GridLoader className="min-h-[200px]" loadingText="Loading quotation items..." />
          ) : calculations.length > 0 ? (
            <div className="space-y-4">
              {calculations.map((calc) => (
                <div key={calc.tile.id} className="border rounded-lg p-3 sm:p-4 bg-muted">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2 sm:gap-0">
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base text-foreground">{calc.tile.code}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">Code: {calc.tile.code}</p>
                      <div className="text-xs text-muted-foreground space-y-1 mt-1">
                        {/* Rooms Details */}
                        {calc.rooms.length > 0 && (
                          <>
                            <p>
                              Rooms: {calc.rooms.map(r => r.name).join(', ')}
                            </p>
                            {(() => {
                              const tileItems = quotationItems?.filter(item => item.tile_id === calc.tile.id) || [];
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
                          </>
                        )}

                        {/* Staircase Details */}
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Size: {formatTileSize(calc.tile.size_length, calc.tile.size_breadth)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Only show Total Area if there are rooms */}
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
                          {calc.rawTilesNeeded || calc.tilesNeeded} tiles
                          {calc.fullBoxes !== undefined && calc.leftoverTiles !== undefined && (
                            <span className="text-xs text-muted-foreground block">
                              ({calc.fullBoxes} {calc.fullBoxes === 1 ? 'box' : 'boxes'}{calc.leftoverTiles > 0 ? ` and ${calc.leftoverTiles} ${calc.leftoverTiles === 1 ? 'tile' : 'tiles'}` : ''})
                              {parseFloat(wastagePercentage) > 0 && ` (+${parseFloat(wastagePercentage)}% wastage)`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-muted-foreground">Boxes Needed</p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustBoxes(calc.tile.id, -1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-medium text-primary min-w-[3rem] text-center">
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
                            {calc.customBoxes && calc.customBoxes > 0 ? '+' : ''}{calc.customBoxes} manual adjustment
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-muted-foreground">Total Cost</p>
                        {discountPercent > 0 && calc.discountedTotalPrice !== undefined ? (
                          <>
                            <p className="text-xs text-muted-foreground line-through">₹{calc.totalPrice.toLocaleString()}</p>
                            <p className="font-bold text-green-600">₹{calc.discountedTotalPrice.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">
                              MRP/Box: ₹{calc.tile.price_per_box?.toLocaleString()} → ₹{calc.discountedPricePerBox?.toLocaleString()}/box
                            </p>
                          </>
                        ) : (
                          <p className="font-bold text-purple-600">₹{calc.totalPrice.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">MRP:</span>
                  <span className="text-lg font-semibold text-foreground">₹{mrp.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Discount:</span>
                    {isManager ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const current = parseFloat(discountPercentage) || 0;
                            setDiscountPercentage(Math.max(0, current - 1).toString());
                            setRoundOffAmount(0);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium min-w-[2rem] text-center">
                          {parseFloat(discountPercentage || "0").toFixed(1)}%
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const current = parseFloat(discountPercentage) || 0;
                            setDiscountPercentage(Math.min(100, current + 1).toString());
                            setRoundOffAmount(0);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium">
                        {parseFloat(discountPercentage || "0").toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-red-600">-₹{discountAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>

                <div className="flex justify-between items-center border-t pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-foreground">Grand Total:</span>
                    {/* ROUND OFF BUTTON — Admin only */}
                    {isManager && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRoundOff}
                        className="h-7 text-xs text-muted-foreground hover:text-primary border-border gap-1"
                        title="Round down to nearest ₹10"
                      >
                        <ArrowDown className="h-3 w-3" />
                        Round Off
                      </Button>
                    )}
                  </div>
                  <div className="text-right">
                    {roundOffAmount > 0 && (
                      <span className="text-xs text-muted-foreground block">Round-off: -₹{roundOffAmount.toLocaleString()}</span>
                    )}
                    <span className="text-xl font-bold text-green-600">₹{finalTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {parseFloat(wastagePercentage) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    All calculations include {parseFloat(wastagePercentage)}% wastage allowance
                  </p>
                )}
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
    </div>
  );
};
