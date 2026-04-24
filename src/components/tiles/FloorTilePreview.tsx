import { useRef, useEffect, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Box } from "lucide-react";
import { RoomVisualizer } from "@/components/rooms/RoomVisualizer";

// Tile type
interface Tile {
  id: string;
  code: string;
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

/* ============================================================
   DESIGN TOKENS — Industrial Craft Preview System
   ============================================================ */
const PREVIEW = {
  // Grout — warm gray, not harsh black
  grout: {
    color: '#C8BFB3',         // Warm stone grout
    width: 2,                 // Hairline precision
  },
  // Background behind the tile field
  backdrop: '#F5F2ED',        // Warm off-white (matches --background)
  // Fallback tile (when image fails)
  fallback: {
    fill: '#E8E2D9',          // Warm stone
    accent: '#D4CCC0',        // Subtle grain lines
    textColor: '#4A4541',     // Dark charcoal
    codeBg: 'rgba(74, 69, 65, 0.06)', // Subtle code background
  },
  // Inset shadow for depth
  shadow: {
    offset: 1,
    blur: 3,
    color: 'rgba(0, 0, 0, 0.08)',
  },
  // Typography
  font: {
    family: 'Manrope, system-ui, sans-serif',
    weight: '600',
    sizeRatio: 0.11,          // Relative to tile size
  },
  // Layout
  padding: 32,               // Canvas outer margin
  cornerRadius: 0,           // Tiles are sharp-edged for realism
} as const;


export const FloorTilePreview = ({
  isOpen, onClose, tile, area, unit
}: FloorTilePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateFloorPreview = useCallback(() => {
    if (!canvasRef.current || !tile) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const tileLength = tile.size_length || 600;
    const tileBreadth = tile.size_breadth || 600;
    const aspectRatio = tileBreadth / tileLength;

    // Grid layout: adapt to tile orientation
    let tilesPerRow: number, tilesPerColumn: number;
    if (aspectRatio > 1) {
      tilesPerRow = 4;
      tilesPerColumn = 6;
    } else {
      tilesPerRow = 6;
      tilesPerColumn = 4;
    }

    const baseSize = 200;
    let tileWidth: number, tileHeight: number;
    if (aspectRatio > 1) {
      tileWidth = baseSize;
      tileHeight = baseSize / aspectRatio;
    } else {
      tileHeight = baseSize;
      tileWidth = baseSize * aspectRatio;
    }

    // Available space
    const maxW = Math.min(window.innerWidth * 0.85, 1100);
    const maxH = Math.min(window.innerHeight * 0.62, 720);

    const groutW = PREVIEW.grout.width;
    const pad = PREVIEW.padding;

    // Required canvas including grout + padding
    const requiredWidth = tilesPerRow * tileWidth + (tilesPerRow + 1) * groutW + pad * 2;
    const requiredHeight = tilesPerColumn * tileHeight + (tilesPerColumn + 1) * groutW + pad * 2;

    const scale = Math.min(maxW / requiredWidth, maxH / requiredHeight, 1);

    const displayWidth = requiredWidth * scale;
    const displayHeight = requiredHeight * scale;

    // High-DPI setup
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // — Backdrop —
    ctx.fillStyle = PREVIEW.backdrop;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // — Drop shadow beneath the tile field —
    const fieldX = pad * scale;
    const fieldY = pad * scale;
    const fieldW = (tilesPerRow * tileWidth + (tilesPerRow + 1) * groutW) * scale;
    const fieldH = (tilesPerColumn * tileHeight + (tilesPerColumn + 1) * groutW) * scale;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 24 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4 * scale;
    ctx.fillStyle = PREVIEW.grout.color;
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
    ctx.restore();

    // — Grout base (fills the field area) —
    ctx.fillStyle = PREVIEW.grout.color;
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // — Draw tiles —
    const scaledTileW = tileWidth * scale;
    const scaledTileH = tileHeight * scale;
    const scaledGrout = groutW * scale;

    const drawTileImage = (x: number, y: number) => {
      if (tile.image_url && tile.image_url.trim() !== '') {
        const img = new window.Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          try {
            if (img.complete && img.naturalWidth && img.naturalHeight) {
              if (window.createImageBitmap) {
                createImageBitmap(img, {
                  resizeWidth: Math.max(scaledTileW * dpr, 256),
                  resizeHeight: Math.max(scaledTileH * dpr, 256),
                  resizeQuality: 'high'
                }).then(bitmap => {
                  ctx.drawImage(bitmap, x, y, scaledTileW, scaledTileH);
                  addTileDepth(x, y, scaledTileW, scaledTileH);
                  bitmap.close();
                }).catch(() => {
                  ctx.drawImage(img, x, y, scaledTileW, scaledTileH);
                  addTileDepth(x, y, scaledTileW, scaledTileH);
                });
              } else {
                ctx.drawImage(img, x, y, scaledTileW, scaledTileH);
                addTileDepth(x, y, scaledTileW, scaledTileH);
              }
            } else {
              drawFallbackTile(x, y);
            }
          } catch {
            drawFallbackTile(x, y);
          }
        };

        img.onerror = () => drawFallbackTile(x, y);

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
      }
    };

    /** Subtle inset shadow for depth on each tile */
    const addTileDepth = (x: number, y: number, w: number, h: number) => {
      // Top-left inner highlight
      const grad = ctx.createLinearGradient(x, y, x, y + h * 0.15);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h * 0.15);

      // Bottom-right inner shadow
      const shadowGrad = ctx.createLinearGradient(x, y + h * 0.85, x, y + h);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.06)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(x, y + h * 0.85, w, h * 0.15);
    };

    const drawFallbackTile = (x: number, y: number) => {
      // Stone-colored fill
      ctx.fillStyle = PREVIEW.fallback.fill;
      ctx.fillRect(x, y, scaledTileW, scaledTileH);

      // Subtle grain texture lines
      ctx.strokeStyle = PREVIEW.fallback.accent;
      ctx.lineWidth = 0.5;
      const grainLines = Math.max(3, Math.floor(scaledTileH / 18));
      for (let i = 0; i < grainLines; i++) {
        const lineY = y + (i * scaledTileH / grainLines) + (scaledTileH / grainLines / 2);
        const offset = (i % 2 === 0) ? 8 : 14;
        ctx.beginPath();
        ctx.moveTo(x + offset, lineY);
        ctx.lineTo(x + scaledTileW - offset, lineY);
        ctx.stroke();
      }

      // Tile code label
      ctx.fillStyle = PREVIEW.fallback.textColor;
      const fontSize = Math.min(scaledTileW, scaledTileH) * PREVIEW.font.sizeRatio;
      ctx.font = `${PREVIEW.font.weight} ${fontSize}px ${PREVIEW.font.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const code = tile.code || 'TILE';
      const maxLength = Math.floor(scaledTileW / (fontSize * 0.55));
      const displayCode = code.length > maxLength ? code.substring(0, maxLength) : code;

      // Code background pill
      const textMetrics = ctx.measureText(displayCode);
      const pillW = textMetrics.width + fontSize * 0.8;
      const pillH = fontSize * 1.6;
      const pillX = x + scaledTileW / 2 - pillW / 2;
      const pillY = y + scaledTileH / 2 - pillH / 2;

      ctx.fillStyle = PREVIEW.fallback.codeBg;
      ctx.beginPath();
      const r = pillH * 0.25;
      ctx.moveTo(pillX + r, pillY);
      ctx.lineTo(pillX + pillW - r, pillY);
      ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
      ctx.lineTo(pillX + pillW, pillY + pillH - r);
      ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
      ctx.lineTo(pillX + r, pillY + pillH);
      ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r);
      ctx.lineTo(pillX, pillY + r);
      ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = PREVIEW.fallback.textColor;
      ctx.fillText(displayCode, x + scaledTileW / 2, y + scaledTileH / 2);

      addTileDepth(x, y, scaledTileW, scaledTileH);
    };

    // Render grid
    for (let row = 0; row < tilesPerColumn; row++) {
      for (let col = 0; col < tilesPerRow; col++) {
        const x = fieldX + scaledGrout + col * (scaledTileW + scaledGrout);
        const y = fieldY + scaledGrout + row * (scaledTileH + scaledGrout);
        drawTileImage(x, y);
      }
    }
  }, [tile]);

  useEffect(() => {
    if (isOpen && tile) {
      setTimeout(() => generateFloorPreview(), 120);
    }
  }, [isOpen, tile, area, generateFloorPreview]);

  const [showRoomView, setShowRoomView] = useState(false);

  if (!tile) return null;

  const tileLengthMM = tile.size_length || 600;
  const tileBreadthMM = tile.size_breadth || 600;
  const aspectRatio = tileBreadthMM / tileLengthMM;
  const gridLabel = aspectRatio > 1 ? '4 × 6' : '6 × 4';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-auto h-auto max-h-[94vh] p-0 rounded-xl overflow-hidden border-border/50 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/40 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Floor Preview
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                {tile.code} &middot; {tileLengthMM}×{tileBreadthMM}mm
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRoomView(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Box className="h-3.5 w-3.5" />
                Room View
              </Button>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary-foreground border border-primary/20"
                    style={{ color: 'hsl(32, 88%, 38%)' }}>
                {gridLabel} Grid
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Canvas area */}
        <div className="flex items-center justify-center p-6 bg-background min-h-[200px]">
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              imageRendering: 'auto',
              borderRadius: '8px',
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/40 bg-card">
          <p className="text-xs text-muted-foreground text-center font-medium">
            Actual tile proportions &middot; {gridLabel} layout &middot; Grout simulation
          </p>
        </div>
      </DialogContent>
    </Dialog>

    {/* 2.5D Room Visualizer */}
    <RoomVisualizer
      isOpen={showRoomView}
      onClose={() => setShowRoomView(false)}
      floorTile={tile}
      roomName="Room Preview"
    />
    </>
  );
};
