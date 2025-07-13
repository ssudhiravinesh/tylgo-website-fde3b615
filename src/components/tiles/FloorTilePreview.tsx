
import { useEffect, useRef } from "react";
import type { Tile } from "@/hooks/useTiles";

interface FloorTilePreviewProps {
  tile: Tile | null;
}

export const FloorTilePreview = ({ tile }: FloorTilePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!tile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gridSize = 4;
    const tileSize = 60;
    const canvasSize = gridSize * tileSize;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const drawTile = (x: number, y: number) => {
      if (tile.image_url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => ctx.drawImage(img, x, y, tileSize, tileSize);
        img.onerror = () => drawFallbackTile(x, y);
        img.src = tile.image_url;
      } else {
        drawFallbackTile(x, y);
      }
    };

    const drawFallbackTile = (x: number, y: number) => {
      ctx.fillStyle = "#e0e7ff";
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(x, y, tileSize, tileSize);
      ctx.fillStyle = "#1e293b";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(tile.name || tile.code || "Tile", x + tileSize / 2, y + tileSize / 2);
    };

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        drawTile(col * tileSize, row * tileSize);
      }
    }
  }, [tile]);

  if (!tile) return null;

  return (
    <div className="p-2 border rounded-lg shadow-sm bg-white">
      <canvas ref={canvasRef} />
      <div className="text-xs text-center text-gray-500 mt-1">Floor Tile Preview</div>
    </div>
  );
};
