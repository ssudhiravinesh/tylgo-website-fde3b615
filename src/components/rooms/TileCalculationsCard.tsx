
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Package, IndianRupee, Layers, Home } from "lucide-react";

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

interface TileCalculationsCardProps {
  calculations: TileCalculation[];
  grandTotal: number;
  wastagePercentage: number;
}

export const TileCalculationsCard = ({ calculations, grandTotal, wastagePercentage }: TileCalculationsCardProps) => {
  if (calculations.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-blue-600" />
            Tile Calculations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Select tiles for rooms to see calculations
          </p>
        </CardContent>
      </Card>
    );
  }

  const floorTiles = calculations.filter(calc => !calc.isWallTile);
  const wallTiles = calculations.filter(calc => calc.isWallTile);

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-blue-600" />
          Tile Calculations ({wastagePercentage}% wastage included)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Floor Tiles Section */}
        {floorTiles.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Home className="h-4 w-4" />
              Floor Tiles
            </h4>
            {floorTiles.map((calc) => (
              <div key={calc.tile.id} className="border rounded-lg p-4 bg-gray-50 mb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">{calc.tile.name}</h4>
                    <p className="text-sm text-gray-600">Code: {calc.tile.code}</p>
                    <p className="text-xs text-gray-500">
                      Rooms: {calc.rooms.map(r => r.name).join(', ')}
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
                          (+{wastagePercentage}% wastage)
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-gray-600">Boxes Needed</p>
                      <p className="font-medium text-blue-600">{calc.boxesNeeded}</p>
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
          </div>
        )}

        {/* Wall Tiles Section - Compact Display */}
        {wallTiles.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Wall Tiles
            </h4>
            {wallTiles.map((calc) => (
              <div key={`${calc.tile.id}_wall`} className="border rounded-lg p-3 bg-blue-50 mb-2">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">{calc.tile.name}</h4>
                    <p className="text-xs text-gray-600">Code: {calc.tile.code}</p>
                    <p className="text-xs text-gray-500">
                      Room: {calc.rooms.map(r => r.name).join(', ')}
                    </p>
                    {calc.wallLayers && calc.wallLayers.length > 0 && (
                      <p className="text-xs text-blue-600">
                        Layers: {calc.wallLayers.sort((a, b) => a - b).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Area</p>
                    <p className="font-medium">{calc.totalArea.toFixed(1)} sq ft</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Tiles</p>
                    <p className="font-medium text-green-600">{calc.tilesNeeded}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Boxes</p>
                    <p className="font-medium text-blue-600">{calc.boxesNeeded}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Cost</p>
                    <p className="font-bold text-purple-600">₹{calc.totalPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-800">Grand Total:</span>
            <span className="text-xl font-bold text-green-600">₹{grandTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            All calculations include {wastagePercentage}% wastage allowance
          </p>
          {floorTiles.length > 0 && wallTiles.length > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              Includes both floor tiles ({floorTiles.length}) and wall tiles ({wallTiles.length})
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
