
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Grid3X3, Ruler, IndianRupee, Package, Square, Download, QrCode } from "lucide-react";
import { useGenerateQRForTile } from "@/hooks/useTileManagement";
import { useState } from "react";
import type { Tile } from "@/hooks/useTiles";

interface TileDetailsDialogProps {
  tile: Tile | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: "admin" | "worker" | "super_admin";
}

export const TileDetailsDialog = ({ tile, isOpen, onClose, userRole }: TileDetailsDialogProps) => {
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const generateQRMutation = useGenerateQRForTile();

  if (!tile) return null;

  const handleGenerateQR = async () => {
    setIsGeneratingQR(true);
    try {
      await generateQRMutation.mutateAsync(tile.id);
    } catch (error) {
      console.error('Error generating QR:', error);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleDownloadQR = () => {
    if (tile.qr_code_url) {
      const link = document.createElement('a');
      link.href = tile.qr_code_url;
      link.download = `${tile.code}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatTileSize = () => {
    if (!tile.size_length || !tile.size_breadth) return 'N/A';

    const lengthInMm = tile.size_length;
    const widthInMm = tile.size_breadth;

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

  const calculatePricePerSqFt = () => {
    if (!tile.price_per_box || !tile.pieces_per_box || !tile.size_length || !tile.size_breadth) {
      return 0;
    }

    const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
    const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764; // Convert to sq ft
    return tile.price_per_box / areaPerBoxSqFt;
  };

  const calculateBoxCoverage = () => {
    if (!tile.size_length || !tile.size_breadth || !tile.pieces_per_box) return 0;
    return (tile.size_length * tile.size_breadth * tile.pieces_per_box) / 92903.04; // Convert to sq ft
  };

  const pricePerSqFt = calculatePricePerSqFt();
  const boxCoverage = calculateBoxCoverage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Tile Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tile Image */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            {tile.image_url ? (
              <img
                src={tile.image_url}
                alt={tile.code}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Grid3X3 className="h-16 w-16 text-muted-foreground/70" />
            )}
          </div>

          {/* Tile Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{tile.code}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{formatTileSize()}</span>
              </div>

              {tile.pieces_per_box && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Pieces/Box:</span>
                  <span className="font-medium">{tile.pieces_per_box}</span>
                </div>
              )}

              {tile.price_per_box && (
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Price/Box:</span>
                  <span className="font-medium text-green-600">
                    ₹{tile.price_per_box.toLocaleString()}
                  </span>
                </div>
              )}

              {pricePerSqFt > 0 && (
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Price/sq ft:</span>
                  <span className="font-medium text-primary">
                    ₹{pricePerSqFt.toFixed(2)}
                  </span>
                </div>
              )}

              {boxCoverage > 0 && (
                <div className="flex items-center gap-2 col-span-2">
                  <Square className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Coverage per box:</span>
                  <span className="font-medium">{boxCoverage.toFixed(2)} sq ft</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Section - Only for admin */}
          {(userRole === "admin" || userRole === "super_admin") && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/80">QR Code</span>
                <div className="flex gap-2">
                  {tile.qr_code_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadQR}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateQR}
                      disabled={isGeneratingQR}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {isGeneratingQR ? 'Generating...' : 'Generate QR'}
                    </Button>
                  )}
                </div>
              </div>
              {tile.qr_code_url && (
                <div className="mt-2 p-2 bg-muted rounded text-center">
                  <img
                    src={tile.qr_code_url}
                    alt={`QR Code for ${tile.code}`}
                    className="w-24 h-24 mx-auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
