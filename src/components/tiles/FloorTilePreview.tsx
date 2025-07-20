import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Tile type
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

export const FloorTilePreview = ({
  isOpen, onClose, tile, area, unit
}: FloorTilePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && tile) {
      setTimeout(() => generateFloorPreview(), 100);
    }
    // eslint-disable-next-line
  }, [isOpen, tile, area]);

  const generateFloorPreview = () => {
    if (!canvasRef.current || !tile) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tilesPerRow = 6;
    const tilesPerColumn = 4;
    const tileLength = tile.size_length || 600;
    const tileBreadth = tile.size_breadth || 600;
    const aspectRatio = tileBreadth / tileLength;
    const baseSize = 120;

    let tileWidth, tileHeight;
    if (aspectRatio > 1) {
      tileWidth = baseSize;
      tileHeight = baseSize / aspectRatio;
    } else {
      tileHeight = baseSize;
      tileWidth = baseSize * aspectRatio;
    }

    // Make the canvas large to take up most of the popup
    // But scale down if contents are smaller for performance
    const maxW = 0.88 * window.innerWidth;
    const maxH = 0.82 * window.innerHeight;
    const canvasWidth = Math.min(maxW, tilesPerRow * tileWidth);
    const canvasHeight = Math.min(maxH, tilesPerColumn * tileHeight);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Calculate scaling factor if canvas had to be shrunk
    const scaleX = canvasWidth / (tilesPerRow * tileWidth);
    const scaleY = canvasHeight / (tilesPerColumn * tileHeight);

    // Clear
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let loadedImages = 0;
    const totalTiles = tilesPerRow * tilesPerColumn;

    const drawTile = (x: number, y: number) => {
      if (tile.image_url && tile.image_url.trim() !== '') {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            if (img.complete && img.naturalWidth && img.naturalHeight) {
              ctx.drawImage(img, x, y, tileWidth * scaleX, tileHeight * scaleY);
              ctx.strokeStyle = '#e5e7eb';
              ctx.lineWidth = 1;
              ctx.strokeRect(x, y, tileWidth * scaleX, tileHeight * scaleY);
            } else {
              drawFallbackTile(x, y);
            }
          } catch {
            drawFallbackTile(x, y);
          }
          loadedImages++;
        };
        img.onerror = () => {
          drawFallbackTile(x, y);
          loadedImages++;
        };
        setTimeout(() => {
          if (!img.complete || img.naturalWidth === 0) {
            drawFallbackTile(x, y);
          }
        }, 5000);
        try {
          img.src = tile.image_url!;
        } catch {
          drawFallbackTile(x, y);
        }
      } else {
        drawFallbackTile(x, y);
        loadedImages++;
      }
    };

    const drawFallbackTile = (x: number, y: number) => {
      const baseHue = 35;
      ctx.fillStyle = `hsl(${baseHue},60%,75%)`;
      ctx.fillRect(x, y, tileWidth * scaleX, tileHeight * scaleY);

      ctx.strokeStyle = `hsl(${baseHue},50%,65%)`;
      ctx.lineWidth = 1;
      const grainLines = Math.max(2, Math.floor((tileHeight * scaleY) / 25));
      for (let i = 0; i < grainLines; i++) {
        const lineY = y + (i * tileHeight * scaleY / grainLines) + ((tileHeight * scaleY) / grainLines / 2);
        ctx.beginPath();
        ctx.moveTo(x + 5, lineY);
        ctx.lineTo(x + tileWidth * scaleX - 5, lineY);
        ctx.stroke();
      }

      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileWidth * scaleX, tileHeight * scaleY);

      ctx.fillStyle = '#374151';
      const fontSize = Math.min(tileWidth, tileHeight) * 0.13 * Math.min(scaleX, scaleY);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const code = tile.code || tile.name || 'Floor';
      const maxLength = Math.floor((tileWidth * scaleX) / 8);
      if (code.length > maxLength) {
        const firstLine = code.substring(0, maxLength);
        const secondLine = code.substring(maxLength, maxLength * 2);
        ctx.fillText(firstLine, x + (tileWidth * scaleX)/2, y + (tileHeight * scaleY)/2 - fontSize/2);
        if (secondLine) {
          ctx.fillText(secondLine, x + (tileWidth * scaleX)/2, y + (tileHeight * scaleY)/2 + fontSize/2);
        }
      } else {
        ctx.fillText(code, x + (tileWidth * scaleX)/2, y + (tileHeight * scaleY)/2);
      }
    };

    for (let row = 0; row < tilesPerColumn; row++) {
      for (let col = 0; col < tilesPerRow; col++) {
        const x = col * tileWidth * scaleX;
        const y = row * tileHeight * scaleY;
        drawTile(x, y);
      }
    }
  };

  if (!tile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!w-[90vw] !h-[88vh] bg-white p-0 flex flex-col items-center justify-start relative overflow-hidden"
        style={{ maxHeight: '88vh', minWidth: 320, minHeight: 320 }}
      >
        {/* Overlayed Header/Close */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white/95 via-white/75 to-transparent z-30">
          <DialogTitle className="text-xl font-semibold truncate">Floor Preview - {tile.name}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Compact floating tile details overlay */}
        <div className="absolute right-6 top-20 z-20 bg-amber-50 border border-amber-200 shadow rounded-lg px-4 py-2 text-xs text-amber-700 space-y-1 min-w-[190px]">
          <div><span className="font-medium text-amber-800">Code:</span> {tile.code || 'N/A'}</div>
          <div><span className="font-medium text-amber-800">Size:</span> {tile.size_length && tile.size_breadth ? `${tile.size_length}×${tile.size_breadth} mm` : 'N/A'}</div>
          <div><span className="font-medium text-amber-800">Area:</span> {area.toFixed(2)} {unit}²</div>
          <div><span className="font-medium text-amber-800">Price:</span> ₹{tile.price_per_box || 'N/A'}</div>
        </div>

        {/* Main content: Fills almost all space */}
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center">
          <div className="w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="block w-full h-full"
              style={{
                width: '98%',
                height: '98%',
                minWidth: 340,
                minHeight: 300,
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                imageRendering: 'crisp-edges'
              }}
            />
          </div>
        </div>

        {/* Info below canvas */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[96%] max-w-xl mx-auto text-center text-xs md:text-sm text-gray-600 bg-white/80 py-2 px-4 rounded shadow-lg">
          This layout preview shows your tile in a 4×6 floor pattern.<br />
          Each tile is shown with its real aspect ratio and dimensions as per your selection.
        </div>
      </DialogContent>
    </Dialog>
  );
};
