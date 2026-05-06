import { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";

interface VisTile {
  id: string;
  code: string;
  image_url?: string;
  size_length?: number;
  size_breadth?: number;
}

interface RoomVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  floorTile?: VisTile | null;
  wallTile?: VisTile | null;
  wallLayers?: VisTile[];
  roomName?: string;
}

export const RoomVisualizer = ({
  isOpen, onClose, floorTile, wallTile, wallLayers, roomName,
}: RoomVisualizerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: -15, y: 35 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [lastPinchDist, setLastPinchDist] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Prevent browser-level pinch-zoom while dialog is open (document-level)
  useEffect(() => {
    if (!isOpen) return;

    // Lock viewport to prevent browser zoom
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalContent = viewport?.getAttribute("content") || "";
    viewport?.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");

    const preventTouchZoom = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    const preventGesture = (e: Event) => e.preventDefault();

    document.addEventListener("touchmove", preventTouchZoom, { passive: false });
    document.addEventListener("touchstart", preventTouchZoom, { passive: false });
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);

    return () => {
      // Restore original viewport
      viewport?.setAttribute("content", originalContent);
      document.removeEventListener("touchmove", preventTouchZoom);
      document.removeEventListener("touchstart", preventTouchZoom);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
    };
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    
    setRotation(prev => ({
      x: prev.x - dy * 0.5,
      y: prev.y + dx * 0.5,
    }));
    
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch support (drag + pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      setLastPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      if (lastPinchDist > 0) {
        const scale = dist / lastPinchDist;
        setZoom((prev) => Math.max(0.3, Math.min(3, prev * scale)));
      }
      setLastPinchDist(dist);
      return;
    }
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startPos.x;
    const dy = e.touches[0].clientY - startPos.y;

    setRotation((prev) => ({
      x: prev.x - dy * 0.5,
      y: prev.y + dx * 0.5,
    }));

    setStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastPinchDist(0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    setZoom((prev) => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.002)));
  };

  // Real-world scale factor: 400px (wall height in CSS) = 3000mm (standard 10ft wall)
  const SCALE = 400 / 3000;

  const getBackgroundStyle = (tile: VisTile | null) => {
    if (!tile || !tile.image_url) return { backgroundColor: '#e5e0d8' };
    
    const w = (tile.size_breadth || 600) * SCALE;
    const h = (tile.size_length || 600) * SCALE;
    
    return {
      backgroundImage: `url(${tile.image_url})`,
      backgroundSize: `${w}px ${h}px`,
      backgroundRepeat: 'repeat',
    };
  };

  const getGroutStyle = (tile: VisTile | null) => {
    const w = (tile?.size_breadth || 600) * SCALE;
    const h = (tile?.size_length || 600) * SCALE;
    return {
      backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)`,
      backgroundSize: `${w}px ${h}px`,
    };
  };

  if (!floorTile && !wallTile && (!wallLayers || wallLayers.length === 0)) return null;

  const floorBg = floorTile ? getBackgroundStyle(floorTile) : { backgroundColor: '#e8e4de' };
  const floorGrout = floorTile ? getGroutStyle(floorTile) : {};

  // Renders a wall surface (handles single tile or multiple layers)
  const renderWallSurface = () => {
    if (wallLayers && wallLayers.length > 0) {
      return (
        <div className="absolute inset-0 flex flex-col-reverse">
          {wallLayers.map((layer, idx) => (
            <div key={idx} className="w-full flex-1 relative">
              <div className="absolute inset-0" style={getBackgroundStyle(layer)} />
              <div className="absolute inset-0 pointer-events-none" style={getGroutStyle(layer)} />
              {/* Subtle seam between layers */}
              {idx > 0 && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black/10" />}
            </div>
          ))}
        </div>
      );
    }
    
    // Single tile fallback or plain wall
    const bg = wallTile ? getBackgroundStyle(wallTile) : { backgroundColor: '#f4f2ef' };
    const grout = wallTile ? getGroutStyle(wallTile) : {};
    return (
      <>
        <div className="absolute inset-0" style={bg} />
        {wallTile && <div className="absolute inset-0 pointer-events-none" style={grout} />}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] w-[95vw] h-auto max-h-[94vh] p-0 rounded-xl overflow-hidden border-border/50 shadow-2xl bg-[#f8f6f3]">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/40 bg-card z-10 relative">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                3D Interactive Visualizer
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                {roomName ? `${roomName} · ` : ''}
                {floorTile ? `Floor: ${floorTile.code}` : ''}
                {floorTile && wallTile ? ' · ' : ''}
                {wallTile ? `Walls: ${wallTile.code}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-md border border-border/40 bg-muted/50">
                <button
                  onClick={() => setZoom((prev) => Math.max(0.3, prev - 0.15))}
                  className="px-2 py-1 text-xs font-bold hover:bg-muted transition-colors rounded-l-md"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="px-2 py-1 text-xs font-semibold text-muted-foreground border-x border-border/40 min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((prev) => Math.min(3, prev + 0.15))}
                  className="px-2 py-1 text-xs font-bold hover:bg-muted transition-colors rounded-r-md"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 border border-primary/20 text-primary-dark">
                Drag to Rotate
              </span>
            </div>
            <DialogClose className="ml-2 flex-shrink-0 rounded-full p-1.5 bg-muted/80 hover:bg-muted border border-border/40 transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* 3D Scene Container */}
        <div
          ref={sceneRef}
          className="relative w-full h-[65vh] overflow-hidden cursor-move bg-[#e8e4de]"
          style={{ perspective: '1200px', touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Room Coordinate System (800x400x600 Cuboid) */}
          <div 
            className="absolute top-1/2 left-1/2 w-[800px] h-[400px] -ml-[400px] -mt-[200px]"
            style={{
              transformStyle: 'preserve-3d',
              transform: `translateZ(-400px) scale(${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            
            {/* CEILING */}
            <div 
              className="absolute top-0 left-0 w-[800px] h-[600px] bg-[#f4f2ef]"
              style={{ transform: 'translateY(-300px) rotateX(90deg)' }}
            />

            {/* BACK WALL */}
            <div 
              className="absolute top-0 left-0 w-[800px] h-[400px] border border-black/5 bg-[#f4f2ef]"
              style={{ transform: 'translateZ(-300px)' }}
            >
              {renderWallSurface()}
              {/* Corner Shadows (Ambient Occlusion) */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none" />
            </div>

            {/* LEFT WALL */}
            <div 
              className="absolute top-0 left-0 w-[600px] h-[400px] border border-black/5 bg-[#f4f2ef]"
              style={{ transform: 'translateX(-300px) rotateY(90deg)' }}
            >
              {renderWallSurface()}
              {/* Corner Shadows */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* RIGHT WALL */}
            <div 
              className="absolute top-0 right-0 w-[600px] h-[400px] border border-black/5 bg-[#f4f2ef]"
              style={{ transform: 'translateX(300px) rotateY(-90deg)' }}
            >
              {renderWallSurface()}
              {/* Corner Shadows */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* FLOOR */}
            <div 
              className="absolute bottom-0 left-0 w-[800px] h-[600px] border border-black/5"
              style={{ transform: 'translateY(300px) rotateX(-90deg)' }}
            >
              <div className="absolute inset-0" style={floorBg} />
              <div className="absolute inset-0 pointer-events-none" style={floorGrout} />
              {/* Corner Shadows */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.15)_100%)] pointer-events-none" />
            </div>
            
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/40 bg-card z-10 relative">
          <p className="text-xs text-muted-foreground text-center font-medium">
            True CSS 3D Engine · Drag to look around · Scroll to zoom · Seamless texture mapping
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
