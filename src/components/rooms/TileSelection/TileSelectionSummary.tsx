/**
 * Summary sidebar — shows calculation breakdown, wastage input, and action buttons.
 * Extracted from TileSelectionStep.tsx (lines 1146-1341).
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Percent, PlusSquare } from "lucide-react";
import { formatTileBreakdown } from "@/utils/tileCalculations";
import type { Room } from "@/hooks/useRooms";
import type { RoomProductSelection } from "@/hooks/useProductSelections";

interface TileCalcResult {
  tile: {
    code: string;
    pieces_per_box?: number;
  };
  isWallTile: boolean;
  wallLayers?: number[];
  rawTilesNeeded: number;
  fullBoxes: number;
  leftoverTiles: number;
  boxesNeeded: number;
  totalPrice: number;
}

interface StaircaseCalcResult {
  staircase: { name: string };
  stepTile?: {
    tile: { code: string };
    tilesNeeded: number;
    boxesNeeded: number;
    totalPrice: number;
  };
  riserTile?: {
    tile: { code: string };
    tilesNeeded: number;
    boxesNeeded: number;
    totalPrice: number;
  };
  totalPrice: number;
}

interface CustomerProduct {
  product_id: string;
  quantity: number;
  product?: {
    name?: string;
    price?: number;
  };
}

interface TileSelectionSummaryProps {
  // Room selection for bulk tile add
  rooms: Room[];
  selectedFloorRooms: Set<string>;
  onBulkAddTile: () => void;
  
  // Wastage
  wastagePercentage: string;
  onWastageChange: (value: string) => void;
  getWastagePercentage: () => number;
  
  // Calculations
  calculations: TileCalcResult[];
  staircaseCalculations: StaircaseCalcResult[];
  grandTotal: number;
  
  // Products
  productSelections: RoomProductSelection[];
  customerProducts: CustomerProduct[];
  
  // Actions
  hasFloorSelections: boolean;
  hasWallSelections: boolean;
  onSaveSelections: () => void;
  onGenerateQuotation: () => void;
}

export const TileSelectionSummary = ({
  rooms,
  selectedFloorRooms,
  onBulkAddTile,
  wastagePercentage,
  onWastageChange,
  getWastagePercentage,
  calculations,
  staircaseCalculations,
  grandTotal,
  productSelections,
  customerProducts,
  hasFloorSelections,
  hasWallSelections,
  onSaveSelections,
  onGenerateQuotation,
}: TileSelectionSummaryProps) => {
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Bulk add tile button */}
      {rooms.filter(r => r.has_floor).length > 0 && (
        <Button
          onClick={onBulkAddTile}
          disabled={selectedFloorRooms.size === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 gap-2 shadow-md py-6 text-lg transition-all transform hover:-translate-y-0.5"
        >
          <PlusSquare className="h-5 w-5" />
          {selectedFloorRooms.size === 0
            ? "Select Rooms to Add Tile"
            : `Add Tile to ${selectedFloorRooms.size} Rooms`}
        </Button>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-green-600" />
            Summary & Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wastage input */}
          <div>
            <Label htmlFor="wastage" className="text-sm font-medium flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4" />
              Wastage Percentage (0-15%)
            </Label>
            <Input
              id="wastage"
              type="number"
              inputMode="numeric"
              min="0"
              max="15"
              step="0.1"
              value={wastagePercentage}
              onChange={(e) => {
                const value = e.target.value;
                const numValue = parseFloat(value);
                if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 15)) {
                  onWastageChange(value);
                }
              }}
              onFocus={handleInputFocus}
              placeholder="Enter 0-15"
              className="text-center"
            />
          </div>

          {/* Calculations */}
          {calculations.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-green-600 text-xl">₹{grandTotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600">Includes {getWastagePercentage()}% wastage</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Breakdown:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {calculations.map((calc, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex-1">
                          <span className="font-medium truncate">{calc.tile.code}</span>
                          {calc.isWallTile && calc.wallLayers && calc.wallLayers.length > 0 && (
                            <span className="text-gray-500 text-xs ml-2">
                              (Layer{calc.wallLayers.length > 1 ? 's' : ''}: {calc.wallLayers.sort((a, b) => a - b).join(', ')})
                            </span>
                          )}
                        </div>
                        <Badge variant={calc.isWallTile ? "secondary" : "default"} className="text-xs">
                          {calc.isWallTile ? "Wall" : "Floor"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-gray-500">Tiles Required</p>
                          <p className="font-medium">
                            {formatTileBreakdown(
                              calc.rawTilesNeeded,
                              calc.fullBoxes,
                              calc.leftoverTiles,
                              parseInt(calc.tile.pieces_per_box?.toString() || '1'),
                              getWastagePercentage()
                            )}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500">Boxes</p>
                          <p className="font-medium">{calc.boxesNeeded}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500">Amount</p>
                          <p className="font-medium">₹{calc.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staircase breakdown */}
              {staircaseCalculations.length > 0 && (
                <div className="space-y-2 pt-2 border-t mt-2">
                  <h4 className="text-sm font-semibold text-orange-800">Staircases:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {staircaseCalculations.map((calc, index) => (
                      <div key={`stair-${index}`} className="bg-orange-50/50 p-2 rounded text-xs border border-orange-100">
                        <p className="font-semibold text-orange-900 mb-1">{calc.staircase.name}</p>

                        {calc.stepTile && (
                          <div className="mb-2 pl-2 border-l-2 border-orange-200">
                            <p className="text-gray-600">Step: <span className="font-medium text-gray-900">{calc.stepTile.tile.code}</span></p>
                            <div className="flex justify-between text-gray-500 mt-0.5">
                              <span>{calc.stepTile.tilesNeeded} tiles ({calc.stepTile.boxesNeeded} boxes)</span>
                              <span>₹{calc.stepTile.totalPrice.toLocaleString()}</span>
                            </div>
                          </div>
                        )}

                        {calc.riserTile && (
                          <div className="pl-2 border-l-2 border-orange-200">
                            <p className="text-gray-600">Riser: <span className="font-medium text-gray-900">{calc.riserTile.tile.code}</span></p>
                            <div className="flex justify-between text-gray-500 mt-0.5">
                              <span>{calc.riserTile.tilesNeeded} tiles ({calc.riserTile.boxesNeeded} boxes)</span>
                              <span>₹{calc.riserTile.totalPrice.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products breakdown */}
              {(productSelections.length > 0 || customerProducts.length > 0) && (
                <div className="space-y-2 pt-2 border-t mt-2">
                  <h4 className="text-sm font-semibold text-purple-800">Products:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {[...productSelections, ...customerProducts].map((cp, index) => (
                      <div key={`prod-${index}`} className="bg-purple-50/50 p-2 rounded text-xs border border-purple-100">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-purple-900 truncate">
                            {cp.product?.name || 'Unknown'}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-white">
                            {'room_id' in cp ? rooms.find(r => r.id === (cp as RoomProductSelection).room_id)?.name : 'Global'}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-gray-500 mt-1">
                          <span>Qty: {cp.quantity} × ₹{(cp.product?.price || 0).toLocaleString()}</span>
                          <span className="font-medium text-gray-900">₹{((cp.quantity || 1) * (cp.product?.price || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Calculator className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Select tiles to see calculations</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={onSaveSelections}
              disabled={!hasFloorSelections && !hasWallSelections}
              className="w-full"
              size="lg"
            >
              Save Selections
            </Button>
            <Button
              onClick={onGenerateQuotation}
              disabled={calculations.length === 0}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Generate Quotation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
