import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Define the Tile type since it's not imported in your original code
interface Tile {
  id: string;
  name: string;
  code?: string;
  image_url?: string;
  size_length?: number;
  size_breadth?: number;
  price_per_box?: number;
}

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
      // Add a small delay to ensure dialog is fully rendered
      setTimeout(() => generateFloorPreview(), 100);
    }
  }, [isOpen, tile, area]);

  const generateFloorPreview = () => {
    if (!canvasRef.current || !tile) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tilesPerRow = 6; // 6 tiles per row
    const tilesPerColumn = 4; // 4 rows (layers) - fixed as requested
    
    // Calculate tile dimensions based on actual size - HORIZONTAL PLACEMENT
    const tileLength = tile.size_length || 600; // Default to 600mm if not specified
    const tileBreadth = tile.size_breadth || 600; // Default to 600mm if not specified
    
    // Calculate aspect ratio for HORIZONTAL placement (breadth becomes width, length becomes height)
    const aspectRatio = tileBreadth / tileLength; // Swapped for horizontal placement
    
    // Base size for display (we'll scale from this)
    const baseSize = 100;
    
    // Calculate actual display dimensions maintaining aspect ratio - HORIZONTAL ORIENTATION
    let tileWidth, tileHeight;
    if (aspectRatio > 1) {
      // Breadth is greater than length (rectangular, longer horizontally)
      tileWidth = baseSize;
      tileHeight = baseSize / aspectRatio;
    } else {
      // Length is greater than or equal to breadth (square or rectangular, longer vertically)
      tileHeight = baseSize;
      tileWidth = baseSize * aspectRatio;
    }
    
    const canvasWidth = tilesPerRow * tileWidth;
    const canvasHeight = tilesPerColumn * tileHeight;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas with white background  
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let loadedImages = 0;
    const totalTiles = tilesPerRow * tilesPerColumn;

    const drawTile = (x: number, y: number) => {
      if (tile.image_url && tile.image_url.trim() !== '') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              // Draw the tile image with horizontal aspect ratio
              ctx.drawImage(img, x, y, tileWidth, tileHeight);
              
              // Add subtle border
              ctx.strokeStyle = '#e5e7eb';
              ctx.lineWidth = 1;
              ctx.strokeRect(x, y, tileWidth, tileHeight);
            } else {
              drawFallbackTile(x, y);
            }
          } catch (error) {
            console.error('Error drawing floor tile image:', error);
            drawFallbackTile(x, y);
          }
          
          loadedImages++;
          if (loadedImages === totalTiles) {
            console.log('All floor tiles loaded successfully');
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load floor tile image:', tile.image_url);
          drawFallbackTile(x, y);
          loadedImages++;
        };
        
        // Add timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete || img.naturalWidth === 0) {
            console.warn('Floor tile image loading timeout:', tile.image_url);
            drawFallbackTile(x, y);
          }
        }, 5000);
        
        try {
          img.src = tile.image_url;
        } catch (error) {
          console.error('Error setting image src for floor tile:', error);
          drawFallbackTile(x, y);
        }
      } else {
        drawFallbackTile(x, y);
        loadedImages++;
      }
    };

    const drawFallbackTile = (x: number, y: number) => {
      // Draw colored rectangle with floor-specific pattern using horizontal dimensions
      const baseHue = 35; // Brown-ish base color for floors
      ctx.fillStyle = `hsl(${baseHue}, 60%, 75%)`;
      ctx.fillRect(x, y, tileWidth, tileHeight);
      
      // Add horizontal wood grain pattern effect adjusted for horizontal tile dimensions
      ctx.strokeStyle = `hsl(${baseHue}, 50%, 65%)`;
      ctx.lineWidth = 1;
      const grainLines = Math.max(2, Math.floor(tileHeight / 25)); // Adjust grain lines for horizontal layout
      for (let i = 0; i < grainLines; i++) {
        const lineY = y + (i * tileHeight / grainLines) + (tileHeight / grainLines / 2);
        ctx.beginPath();
        ctx.moveTo(x + 5, lineY);
        ctx.lineTo(x + tileWidth - 5, lineY);
        ctx.stroke();
      }
      
      // Add border
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileWidth, tileHeight);
      
      // Add tile code text - adjust font size based on horizontal tile dimensions
      ctx.fillStyle = '#374151';
      const fontSize = Math.min(tileWidth, tileHeight) * 0.12; // Scale font size with tile size
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const code = tile.code || tile.name || 'Floor';
      const maxLength = Math.floor(tileWidth / 8); // Adjust max length based on tile width
      
      if (code.length > maxLength) {
        const firstLine = code.substring(0, maxLength);
        const secondLine = code.substring(maxLength, maxLength * 2);
        ctx.fillText(firstLine, x + tileWidth/2, y + tileHeight/2 - fontSize/2);
        if (secondLine) {
          ctx.fillText(secondLine, x + tileWidth/2, y + tileHeight/2 + fontSize/2);
        }
      } else {
        ctx.fillText(code, x + tileWidth/2, y + tileHeight/2);
      }
    };
    
    // Draw all tiles in a 4x6 grid pattern with horizontal dimensions
    for (let row = 0; row < tilesPerColumn; row++) {
      for (let col = 0; col < tilesPerRow; col++) {
        const x = col * tileWidth;
        const y = row * tileHeight;
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
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-amber-800">Tile Code:</span>
                <p className="text-amber-700">{tile.code || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-amber-800">Size:</span>
                <p className="text-amber-700">
                  {tile.size_length && tile.size_breadth 
                    ? `${tile.size_length}×${tile.size_breadth} mm` 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <span className="font-medium text-amber-800">Floor Area:</span>
                <p className="text-amber-700">{area.toFixed(2)} {unit}²</p>
              </div>
              <div>
                <span className="font-medium text-amber-800">Price/Box:</span>
                <p className="text-amber-700">₹{tile.price_per_box || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Floor Layout Preview (4 Layers × 6 Tiles)</h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg bg-white p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto block"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center max-w-md">
              This preview shows how your selected tile will look when laid on the floor in a 4×6 pattern. 
              Each tile is displayed horizontally with its actual aspect ratio based on the tile dimensions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};