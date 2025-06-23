
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Package, DollarSign } from "lucide-react";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface TileCalculation {
  tile: Tile;
  rooms: Room[];
  totalArea: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
}

interface TileCalculationsCardProps {
  calculations: TileCalculation[];
  grandTotal: number;
}

export const TileCalculationsCard = ({ calculations, grandTotal }: TileCalculationsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Tile Requirements & Pricing
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
                
                <div className="text-sm space-y-1">
                  <p><strong>Rooms:</strong> {calc.rooms.map(r => r.name).join(", ")}</p>
                  <p><strong>Total Area:</strong> {calc.totalArea.toFixed(2)} m²</p>
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
