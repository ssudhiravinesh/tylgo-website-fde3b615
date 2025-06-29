
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, User, Phone, MapPin, Calendar, IndianRupee, Download } from "lucide-react";
import { formatDimensions, formatArea, calculateAreaInSquareFeet } from "@/utils/unitConversions";
import { usePDFGeneration } from "@/hooks/usePDFGeneration";
import type { Quotation } from "@/hooks/useQuotations";

interface QuotationDetailsProps {
  quotation: Quotation;
  onBack: () => void;
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

  const calculateItemDetails = (item: any) => {
    const room = item.room;
    const tile = item.tile;
    
    if (!room || !tile) return null;

    // Calculate area in square feet
    const areaInSqFt = room.length && room.width && room.unit 
      ? calculateAreaInSquareFeet(room.length, room.width, room.unit as Unit)
      : parseFloat(item.area) || 0;

    // Calculate tiles and boxes needed (assuming 10% wastage)
    const wastagePercentage = 10;
    let tilesNeeded = 0;
    let boxesNeeded = 0;

    if (tile.size_length && tile.size_breadth && tile.pieces_per_box) {
      // Convert tile dimensions to feet
      const tileLengthFt = tile.size_length / 304.8; // mm to ft
      const tileWidthFt = tile.size_breadth / 304.8; // mm to ft
      const tileAreaSqFt = tileLengthFt * tileWidthFt;
      
      if (tileAreaSqFt > 0) {
        // Calculate basic tiles needed for the area
        const basicTilesNeeded = Math.ceil(areaInSqFt / tileAreaSqFt);
        
        // Add wastage percentage to tiles
        tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
        
        // Calculate boxes needed from total tiles
        boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
      }
    }

    return {
      areaInSqFt,
      tilesNeeded,
      boxesNeeded,
    };
  };

  const handleDownloadPDF = () => {
    generateQuotationPDF(quotation, 10); // Default 10% wastage
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
                {quotation.customer?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <span className="text-sm">{quotation.customer.address}</span>
                  </div>
                )}
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
                    Total: ₹{(quotation.total_cost || 0).toLocaleString()}
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

      {/* Quotation Items */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Quotation Items
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {quotation.quotation_items && quotation.quotation_items.length > 0 ? (
            <div className="space-y-4">
              {quotation.quotation_items.map((item, index) => {
                const details = calculateItemDetails(item);
                
                return (
                  <div key={item.id || index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Room Details */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          Room: {item.room?.name || 'Unknown Room'}
                        </h4>
                        <div className="space-y-2 pl-6">
                          {item.room && (
                            <>
                              <div className="text-sm">
                                <span className="text-gray-600">Dimensions: </span>
                                <span className="font-medium">
                                  {formatDimensions(item.room.length, item.room.width, item.room.unit as Unit)}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Area: </span>
                                <span className="font-medium">
                                  {formatArea(details?.areaInSqFt || 0)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Tile Details */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Tile: {item.tile?.name || 'Unknown Tile'}
                        </h4>
                        <div className="space-y-2 pl-6">
                          {item.tile && (
                            <>
                              <div className="text-sm">
                                <span className="text-gray-600">Code: </span>
                                <Badge variant="secondary" className="text-xs">
                                  {item.tile.code}
                                </Badge>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Size: </span>
                                <span className="font-medium">
                                  {formatTileSize(item.tile.size_length, item.tile.size_breadth)}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Price per box: </span>
                                <span className="font-medium text-green-600">
                                  ₹{(item.tile.price_per_box || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Pieces per box: </span>
                                <span className="font-medium">{item.tile.pieces_per_box || 'N/A'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Calculation Summary */}
                    {details && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-sm text-gray-600">Tiles Required</div>
                            <div className="font-semibold text-lg">{details.tilesNeeded}</div>
                            <div className="text-xs text-gray-500">+10% wastage</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Boxes Needed</div>
                            <div className="font-semibold text-lg">{details.boxesNeeded}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Item Total</div>
                            <div className="font-bold text-lg text-green-600">
                              ₹{(details.boxesNeeded * (item.tile?.price_per_box || 0)).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
