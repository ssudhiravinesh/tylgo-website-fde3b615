
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Grid3X3, Ruler, IndianRupee, Check, QrCode, Download, Plus, Package, Square } from "lucide-react";
import { Tile } from "@/hooks/useTiles";

interface TileCardProps {
  tile: Tile;
  isSelected: boolean;
  isAdmin: boolean;
  showAssignButton: boolean;
  onTileSelect: (tileId: string) => void;
  onGenerateQR: (tileId: string, e: React.MouseEvent) => void;
  onDownloadQR: (qrUrl: string, tileCode: string, e: React.MouseEvent) => void;
  onViewDetails: (tileId: string, e: React.MouseEvent) => void;
  onAssignClick: (e: React.MouseEvent) => void;
  isGeneratingQR: boolean;
  children?: React.ReactNode;
}

export const TileCard = ({
  tile,
  isSelected,
  isAdmin,
  showAssignButton,
  onTileSelect,
  onGenerateQR,
  onDownloadQR,
  onViewDetails,
  onAssignClick,
  isGeneratingQR,
  children
}: TileCardProps) => {
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger card click if the click is not on a button
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return; // Don't trigger card click if clicking on a button
    }
    onTileSelect(tile.id);
  };

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
      }`}
      onClick={handleCardClick}
    >
    <CardContent className="p-4">
      <div 
        className="bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden w-full"
        style={{ 
          aspectRatio: '2/1',
          minHeight: '100px',
          maxHeight: '200px'
        }}
      >
        {tile.image_url ? (
          <img 
            src={tile.image_url} 
            alt={tile.name}
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-gray-500">No image available</div>
        )}
      </div>
            
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {tile.code}
          </div>
          
          <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">
            <Badge variant="secondary" className="text-xs font-mono">
              {tile.name}
            </Badge>
            {isSelected && (
              <Badge className="bg-blue-600 text-white text-xs">
                <Check className="h-3 w-3 mr-1" />
                Selected
              </Badge>
            )}
          </h3>
          
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Ruler className="h-3 w-3" />
            {tile.size_length} × {tile.size_breadth} mm
          </div>
          
          <div className="space-y-1">
            {tile.price_per_box && (
              <div className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                <IndianRupee className="h-4 w-4" />
                {tile.price_per_box.toLocaleString()} per box
              </div>
            )}
            
            {tile.pieces_per_box && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Package className="h-3 w-3" />
                {tile.pieces_per_box} pieces/box
              </div>
            )}

            {tile.size_length && tile.size_breadth && tile.pieces_per_box && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Square className="h-3 w-3" />
                {(
                  (tile.size_length *
                    tile.size_breadth *
                    tile.pieces_per_box) /
                  92903.04
                ).toFixed(2)}{" "}
                sq ft/box
              </div>
            )}
          </div>

          {/* QR Code Section - Only show for admins */}
          {isAdmin && (
            <div className="flex items-center justify-between mt-2">
              {tile.qr_code_url ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => onDownloadQR(tile.qr_code_url!, tile.code, e)}
                  className="flex-1 mr-1"
                >
                  <Download className="h-3 w-3 mr-1" />
                  QR
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => onGenerateQR(tile.id, e)}
                  disabled={isGeneratingQR}
                  className="flex-1 mr-1"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  {isGeneratingQR ? 'Gen...' : 'QR'}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => onViewDetails(tile.id, e)}
                className="text-blue-600 hover:text-blue-800 px-2"
              >
                View
              </Button>
            </div>
          )}

          {/* For workers, only show View button */}
          {!isAdmin && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => onViewDetails(tile.id, e)}
                className="w-full text-blue-600 hover:text-blue-800"
              >
                View Details
              </Button>
            </div>
          )}

          {isSelected && showAssignButton && (
            <Button 
              size="sm" 
              className="w-full mt-2 gap-2"
              onClick={onAssignClick}
            >
              <Plus className="h-4 w-4" />
              Assign to Rooms
            </Button>
          )}

          {children}
        </div>
      </CardContent>
    </Card>
  );
};
