
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Percent, Plus, Trash2, Calculator, Package, IndianRupee, Layers, Copy, Minus, Eye } from "lucide-react";
import { useTiles } from "@/hooks/useTiles";
import { useRoomTileSelections, useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { WallTileSelectionPage } from "./WallTileSelectionPage";
import { FloorTilePreview } from "@/components/tiles/FloorTilePreview";
import { toast } from "sonner";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import { 
  calculateTileRequirements, 
  calculateGrandTotal, 
  prepareQuotationItems,
  type FloorTileSelection,
  type WallTileSelection,
  type WallTileLayer,
  formatTileBreakdown
} from "@/utils/tileCalculations";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";

interface TileSelectionStepProps {
  customerId: string;
  rooms: Room[];
  onBack: () => void;
}

export const TileSelectionStep = ({ customerId, rooms, onBack }: TileSelectionStepProps) => {
  const { data: tiles = [], isLoading: tilesLoading } = useTiles();
  const { data: selections = [], isLoading: selectionsLoading } = useRoomTileSelections(customerId);
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  
  const [floorTileSelections, setFloorTileSelections] = useState<FloorTileSelection[]>([]);
  const [wallTileSelections, setWallTileSelections] = useState<WallTileSelection[]>([]);
  const [wastagePercentage, setWastagePercentage] = useState<string>("0");
  const [showTileCatalog, setShowTileCatalog] = useState(false);
  const [catalogContext, setCatalogContext] = useState<{
    roomId: string;
    isWallTile: boolean;
    layerNumber?: number;
  } | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showWallTileSelection, setShowWallTileSelection] = useState<{
    roomId: string;
    room: Room;
  } | null>(null);
  const [showFloorPreview, setShowFloorPreview] = useState<{
    room: Room;
    tile: Tile | null;
  } | null>(null);

  const floorRooms = rooms.filter(room => room.room_type === "floor");
  const wallRooms = rooms.filter(room => room.room_type === "wall");

  const getWastagePercentage = () => {
    return parseFloat(wastagePercentage) || 0;
  };

  const handleSaveSelections = async () => {
    try {
      // Save logic here
      toast.success("Selections saved successfully!");
    } catch (error) {
      toast.error("Failed to save selections");
    }
  };

  const handleGenerateQuotation = () => {
    setShowQuotationForm(true);
  };

  useEffect(() => {
    // existing initialization logic...
  }, [selections, rooms]);

  // existing handlers omitted for brevity...

  const calculations = calculateTileRequirements(
    floorTileSelections,
    wallTileSelections,
    rooms,
    tiles,
    getWastagePercentage()
  );
  const grandTotal = calculateGrandTotal(calculations);

  if (tilesLoading || selectionsLoading) return (<div>Loading...</div>);
  if (showWallTileSelection) return /* wall selection view */ null;
  if (showQuotationForm) return /* quotation form view */ null;

  return (
    <div className="space-y-6">
      {/* header and rooms omitted for brevity... */}

      {/* Summary & Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-green-600" />
            Summary & Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wastage input omitted */}

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
                        <div className="flex-1 truncate font-medium">{calc.tile.name}
                          {calc.isWallTile && calc.wallLayers && (
                            <span className="text-gray-500 ml-2 text-xs">
                              (Layers: {calc.wallLayers.sort((a, b) => a - b).join(', ')})
                            </span>
                          )}
                        </div>
                        <Badge variant={calc.isWallTile ? 'secondary' : 'default'} className="text-xs">
                          {calc.isWallTile ? 'Wall' : 'Floor'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {/* Tiles Column with breakdown */}
                         <div className="text-center">
                          <p className="text-gray-500">Tiles</p>
                          <p className="font-medium">
                            {calc.rawTilesNeeded}
                            <br />
                            <span className="text-xs text-gray-500">
                              {formatTileBreakdown(calc.fullBoxes, calc.leftoverTiles)}
                            </span>
                          </p>
                        </div>

                        {/* Boxes Column */}
                        <div className="text-center">
                          <p className="text-gray-500">Boxes</p>
                          <p className="font-medium">{calc.boxesNeeded}</p>
                        </div>

                        {/* Amount Column */}
                        <div className="text-center">
                          <p className="text-gray-500">Amount</p>
                          <p className="font-medium">₹{calc.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Calculator className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Select tiles to see calculations</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t">
            <Button onClick={handleSaveSelections} disabled={!calculations.length} className="w-full" size="lg">
              Save Selections
            </Button>
            <Button onClick={handleGenerateQuotation} disabled={!calculations.length} className="w-full bg-green-600 hover:bg-green-700" size="lg">
              Generate Quotation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tile Catalog & Preview dialogs omitted */}
    </div>
  );
};
