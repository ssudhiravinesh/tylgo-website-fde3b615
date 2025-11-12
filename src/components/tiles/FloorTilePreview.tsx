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

    // High-DPI canvas setup
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    const tilesPerRow = 6;
    const tilesPerColumn = 4;
    const tileLength = tile.size_length || 600;  // in mm
    const tileBreadth = tile.size_breadth || 600; // in mm
    
    // Calculate available space in the dialog (leaving space for header/footer)
    const maxW = Math.min(window.innerWidth * 0.88, 1200);
    const maxH = Math.min(window.innerHeight * 0.7, 800);
    
    // Total physical dimensions needed (in mm)
    const totalPhysicalWidth = tilesPerRow * tileLength;
    const totalPhysicalHeight = tilesPerColumn * tileBreadth;
    
    // Calculate uniform scale factor (pixels per mm)
    const scaleX = maxW / totalPhysicalWidth;
    const scaleY = maxH / totalPhysicalHeight;
    const scale = Math.min(scaleX, scaleY); // Use smaller to ensure fit
    
    // Calculate tile dimensions in pixels
    const tileWidth = tileLength * scale;
    const tileHeight = tileBreadth * scale;
    
    // Calculate actual canvas size
    const displayWidth = tilesPerRow * tileWidth;
    const displayHeight = tilesPerColumn * tileHeight;
    
    // Set high-DPI canvas dimensions
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    
    // Scale canvas display size
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Scale context for high-DPI
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

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
              // Create a higher quality image using createImageBitmap if available
              if (window.createImageBitmap) {
                createImageBitmap(img, {
                  resizeWidth: Math.max(tileWidth * devicePixelRatio, 256),
                  resizeHeight: Math.max(tileHeight * devicePixelRatio, 256),
                  resizeQuality: 'high'
                }).then(bitmap => {
                  ctx.drawImage(bitmap, x, y, tileWidth, tileHeight);
                  ctx.strokeStyle = '#e5e7eb';
                  ctx.lineWidth = 1 / devicePixelRatio;
                  ctx.strokeRect(x, y, tileWidth, tileHeight);
                  bitmap.close();
                }).catch(() => {
                  // Fallback to regular drawImage
                  ctx.drawImage(img, x, y, tileWidth, tileHeight);
                  ctx.strokeStyle = '#e5e7eb';
                  ctx.lineWidth = 1 / devicePixelRatio;
                  ctx.strokeRect(x, y, tileWidth, tileHeight);
                });
              } else {
                // Fallback for browsers without createImageBitmap
                ctx.drawImage(img, x, y, tileWidth, tileHeight);
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 1 / devicePixelRatio;
                ctx.strokeRect(x, y, tileWidth, tileHeight);
              }
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
        
        // Load timeout fallback
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
      ctx.fillRect(x, y, tileWidth, tileHeight);

      ctx.strokeStyle = `hsl(${baseHue},50%,65%)`;
      ctx.lineWidth = 1 / devicePixelRatio;
      const grainLines = Math.max(2, Math.floor(tileHeight / 25));
      for (let i = 0; i < grainLines; i++) {
        const lineY = y + (i * tileHeight / grainLines) + (tileHeight / grainLines / 2);
        ctx.beginPath();
        ctx.moveTo(x + 5, lineY);
        ctx.lineTo(x + tileWidth - 5, lineY);
        ctx.stroke();
      }

      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2 / devicePixelRatio;
      ctx.strokeRect(x, y, tileWidth, tileHeight);

      ctx.fillStyle = '#374151';
      const fontSize = Math.min(tileWidth, tileHeight) * 0.13;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const code = tile.code || tile.name || 'Floor';
      const maxLength = Math.floor(tileWidth / 8);
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
