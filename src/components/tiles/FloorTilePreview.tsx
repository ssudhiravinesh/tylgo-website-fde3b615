import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Tile } from "@/hooks/useTiles";

interface FloorTilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  tile: Tile | null;
  area: number;
  unit: string;
}

export const FloorTilePreview = ({ isOpen, onClose, tile, area, unit }: FloorTilePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && tile) {
      generateFloorPreview();
    }
  }, [isOpen, tile, area]);

  const generateFloorPreview = () => {
    if (!canvasRef.current || !tile) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tilesPerRow = 8; // Show 8 tiles per row
    const tilesPerColumn = 6; // Show 6 rows
    const tileSize = 80; // Size of each tile in pixels
    const canvasWidth = tilesPerRow * tileSize;
    const canvasHeight = tilesPerColumn * tileSize;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const drawTile = (x: number, y: number) => {
      if (tile.image_url && tile.image_url.trim() !== '') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              ctx.drawImage(img, x, y, tileSize, tileSize);
              // Add subtle border
              ctx.strokeStyle = '#e5e7eb';
              ctx.lineWidth = 1;
              ctx.strokeRect(x, y, tileSize, tileSize);
            } else {
              drawFallbackTile(x, y);
            }
          } catch (error) {
            console.error('Error drawing floor tile image:', error);
            drawFallbackTile(x, y);
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load floor tile image:', tile.image_url);
          drawFallbackTile(x, y);
        };
        
        // Add timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete || img.naturalWidth === 0) {
            console.warn('Floor tile image loading timeout:', tile.image_url);
            drawFallbackTile(x, y);
          }
        }, 5000);
        
        img.src = tile.image_url;
      } else {
        drawFallbackTile(x, y);
      }
    };

    const drawFallbackTile = (x: number, y: number) => {
      // Draw colored rectangle with pattern
      const baseHue = 200; // Blue-ish base color for floors
      ctx.fillStyle = `hsl(${baseHue}, 45%, 80%)`;
      ctx.fillRect(x, y, tileSize, tileSize);
      
      // Add border
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileSize, tileSize);
      
      // Add tile code text
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const code = tile.code || tile.name || 'Floor';
      const maxLength = 8;
      
      if (code.length > maxLength) {
        const firstLine = code.substring(0, maxLength);
        const secondLine = code.substring(maxLength, maxLength * 2);
        ctx.fillText(firstLine, x + tileSize/2, y + tileSize/2 - 6);
        if (secondLine) {
          ctx.fillText(secondLine, x + tileSize/2, y + tileSize/2 + 6);
        }
      } else {
        ctx.fillText(code, x + tileSize/2, y + tileSize/2);
      }
    };
    
    // Draw all tiles in a grid pattern
    for (let row = 0; row < tilesPerColumn; row++) {
      for (let col = 0; col < tilesPerRow; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        drawTile(x, y);
      }
    }
  };

  if (!tile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Floor Preview - {tile.name}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Tile Code:</span>
                <p className="text-blue-700">{tile.code}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Size:</span>
                <p className="text-blue-700">{tile.size_length}×{tile.size_breadth} mm</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Floor Area:</span>
                <p className="text-blue-700">{area.toFixed(2)} {unit}²</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Price/Box:</span>
                <p className="text-blue-700">₹{tile.price_per_box || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Floor Layout Preview</h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg bg-white p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center max-w-md">
              This preview shows how your selected tile will look when laid on the floor. 
              The pattern represents the actual tile arrangement.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};