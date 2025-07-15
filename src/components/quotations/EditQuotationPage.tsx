
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCustomers } from '@/hooks/useCustomers';
import { useTiles } from '@/hooks/useTiles';
import { useQuotations, type Quotation, type QuotationItem } from '@/hooks/useQuotations';
import { calculateAreaInSquareFeet } from '@/utils/unitConversions';
import type { TileCalculationResult } from '@/utils/tileCalculations';
import { formatTileBreakdown } from '@/utils/tileCalculations';

interface EditQuotationPageProps {
  quotationId: string;
  onBack: () => void;
}

export const EditQuotationPage = ({ quotationId, onBack }: EditQuotationPageProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [quotationData, setQuotationData] = useState<Quotation | null>(null);
  const [currentWastagePercentage, setCurrentWastagePercentage] = useState<number>(0);
  const [calculations, setCalculations] = useState<TileCalculationResult[]>([]);

  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  const { data: tiles = [], isLoading: isTilesLoading } = useTiles();
  const { data: quotations = [], isLoading: isQuotationsLoading, updateQuotation } = useQuotations();

  useEffect(() => {
    if (quotationId && quotations) {
      const quotation = quotations.find(q => q.id === quotationId);
      setQuotationData(quotation || null);
      setCurrentWastagePercentage(quotation?.wastage_percentage || 0);
    }
  }, [quotationId, quotations]);

  useEffect(() => {
    if (quotationData?.quotation_items && tiles) {
      const tileMap = new Map(tiles.map(tile => [tile.id, tile]));
      const updatedCalculations: TileCalculationResult[] = [];

      // Group items by tile_id
      const itemsByTile = quotationData.quotation_items.reduce((acc, item) => {
        if (!acc[item.tile_id]) {
          acc[item.tile_id] = [];
        }
        acc[item.tile_id].push(item);
        return acc;
      }, {} as Record<string, QuotationItem[]>);

      Object.entries(itemsByTile).forEach(([tileId, items]) => {
        const tile = tileMap.get(tileId);
        if (!tile) return;

        const totalArea = items.reduce((sum, item) => sum + item.area, 0);
        const totalPrice = items.reduce((sum, item) => sum + item.total_price, 0);
        const isWallTile = items.some(item => item.layer_number !== undefined && item.layer_number !== null);
        
        const pricePerBox = parseFloat(tile.price_per_box?.toString() || '0');
        const piecesPerBox = parseInt(tile.pieces_per_box?.toString() || '1');
        
        // Calculate tile requirements
        const tileLengthFt = (parseFloat(tile.size_length.toString()) || 0) / 304.8;
        const tileBreadthFt = (parseFloat(tile.size_breadth.toString()) || 0) / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          // 1. Compute raw tiles needed (area + wastage)
          const basicTiles = totalArea / tileAreaSqFt;
          const rawTilesNeeded = Math.ceil(basicTiles * (1 + currentWastagePercentage / 100));
          
          // 2. Compute boxes you'll actually order
          const boxesNeeded = Math.ceil(rawTilesNeeded / piecesPerBox);
          
          // 3. Compute conceptual breakdown
          const fullBoxes = Math.floor(rawTilesNeeded / piecesPerBox);
          const leftoverTiles = rawTilesNeeded % piecesPerBox;
          
          const calc: TileCalculationResult = {
            tile,
            rooms: [], // We don't have room data in this context
            totalArea,
            rawTilesNeeded,
            boxesNeeded,
            orderedTiles: boxesNeeded * piecesPerBox,
            fullBoxes,
            leftoverTiles,
            totalPrice,
            isWallTile,
            piecesPerBox,
          };

          updatedCalculations.push(calc);
        }
      });

      setCalculations(updatedCalculations);
    }
  }, [quotationData, tiles, currentWastagePercentage]);

  const handleWastageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setCurrentWastagePercentage(newValue);
  };

  const handleUpdateQuotation = async () => {
    if (!quotationData) return;

    try {
      await updateQuotation({
        id: quotationId,
        wastage_percentage: currentWastagePercentage,
      });
      toast.success('Quotation updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quotation');
    }
  };

  if (isCustomersLoading || isTilesLoading || isQuotationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotations
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">
          Edit Quotation
        </h1>
      </div>

      {/* Quotation Details */}
      {quotationData && (
        <Card>
          <CardHeader>
            <CardTitle>Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quotation-number">Quotation Number</Label>
                <Input
                  id="quotation-number"
                  value={quotationData.quotation_number}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="customer-name">Customer Name</Label>
                <Input
                  id="customer-name"
                  value={quotationData.customer?.name || ''}
                  readOnly
                />
              </div>
            </div>
            <div>
              <Label htmlFor="wastage">Wastage Percentage</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="wastage"
                  type="number"
                  value={currentWastagePercentage}
                  onChange={handleWastageChange}
                />
                <span>%</span>
              </div>
            </div>
            <Button onClick={handleUpdateQuotation}>
              Update Quotation
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Tile Calculations Display */}
      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Tile Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculations.map((calc, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">
                        {calc.tile.name} ({calc.tile.code})
                        {calc.isWallTile && (
                          <span className="text-sm text-blue-600 ml-2">Wall Tile</span>
                        )}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{calc.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Area</p>
                      <p className="font-medium">{calc.totalArea.toFixed(2)} sq ft</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tiles Required</p>
                      <p className="font-medium text-green-600">
                        {calc.rawTilesNeeded} tiles
                        <span className="text-xs text-gray-500 block">
                          {formatTileBreakdown(calc.fullBoxes, calc.leftoverTiles)}
                          <br />
                          (+{currentWastagePercentage}% wastage)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Boxes to Order</p>
                      <p className="font-medium text-blue-600">
                        {calc.boxesNeeded} boxes
                        <span className="text-xs text-gray-500 block">
                          ({calc.orderedTiles} tiles total)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Price per Box</p>
                      <p className="font-medium">₹{calc.tile.price_per_box}</p>
                      <p className="text-xs text-gray-500">{calc.tile.pieces_per_box} tiles/box</p>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Cost:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{calculations.reduce((sum, calc) => sum + calc.totalPrice, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
