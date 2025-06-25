
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Package, DollarSign, Ruler, Percent } from "lucide-react";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import { calculateAreaInSquareFeet, formatDimensions, formatArea } from "@/utils/unitConversions";

interface TileCalculation {
  tile: Tile;
  rooms: Room[];
  totalArea: number;
  effectiveArea: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
}

interface TileCalculationsCardProps {
  calculations: TileCalculation[];
  grandTotal: number;
  wastagePercentage: number;
}

export const TileCalculationsCard = ({ calculations, grandTotal, wastagePercentage }: TileCalculationsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Tile Requirements & Pricing (Square Feet)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {calculations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Select tiles for rooms to see calculations
          </p>
        ) : (
          <>
            {calculations.map((calc, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{calc.tile.name}</h4>
                  <Badge variant="outline">{calc.tile.code}</Badge>
                </div>
                
                <div className="text-sm space-y-2">
                  <div>
                    <p className="font-medium mb-1">Room Details:</p>
                    {calc.rooms.map((room, roomIndex) => {
                      const roomAreaSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
                      return (
                        <div key={roomIndex} className="ml-2 text-xs text-gray-600">
                          <span className="font-medium">{room.name}:</span> {formatDimensions(room.length, room.width, room.unit)} = {formatArea(roomAreaSqFt)}
                        </div>
                      );
                    })}
                  </div>
                  
                  <p className="flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    <strong>Original Area:</strong> {formatArea(calc.totalArea)}
                  </p>
                  
                  {wastagePercentage > 0 && (
                    <p className="flex items-center gap-1 text-orange-600">
                      <Percent className="h-3 w-3" />
                      <strong>Effective Area (with {wastagePercentage}% wastage):</strong> {formatArea(calc.effectiveArea)}
                    </p>
                  )}
                  
                  <p className="flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    <strong>Tiles Needed:</strong> {calc.tilesNeeded}
                  </p>
                  <p className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <strong>Boxes Needed:</strong> {calc.boxesNeeded}
                  </p>
                  <p className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <strong>Total Price:</strong> ₹{calc.totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-blue-800">Grand Total</h4>
                <p className="text-xl font-bold text-blue-800">₹{grandTotal.toFixed(2)}</p>
              </div>
              {wastagePercentage > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  * Includes {wastagePercentage}% wastage allowance
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
