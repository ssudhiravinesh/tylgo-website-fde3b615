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
          className="max-w-[98vw] w-[98vw] h-[92vh] p-8 rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle>Floor Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center w-full h-full">
            <div className="flex flex-col items-center justify-center flex-grow w-full h-full">
              <div className="w-full h-full max-w-full max-h-full p-6">
                <div className="border rounded-xl overflow-hidden shadow bg-white w-full h-full flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 text-center mt-4">
            <p>Preview shows 4 X 6 tiles with actual tile proportions</p>
          </div>
      </DialogContent>
    </Dialog>
  );
};
