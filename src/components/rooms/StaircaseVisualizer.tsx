/**
 * 3D CSS Staircase Visualizer
 * 
 * Renders a CSS 3D isometric staircase with step and riser tiles.
 * Similar to RoomVisualizer but specifically for staircase preview.
 * Steps are the horizontal surfaces (top of each step) and risers are
 * the vertical surfaces (front face of each step).
 */

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface VisTile {
  id: string;
  code: string;
  image_url?: string;
  size_length?: number;
  size_breadth?: number;
}

interface StaircaseVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  stepTile?: VisTile | null;
  riserTile?: VisTile | null;
  staircaseName?: string;
  numberOfSteps?: number;
}

export const StaircaseVisualizer = ({
  isOpen,
  onClose,
  stepTile,
  riserTile,
  staircaseName,
  numberOfSteps = 6,
}: StaircaseVisualizerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: -25, y: 45 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [lastPinchDist, setLastPinchDist] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;

    setRotation((prev) => ({
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

  // Limit display steps for performance (max 12 visible)
  const displaySteps = Math.min(numberOfSteps, 12);

  // Step dimensions in pixels
  const STEP_WIDTH = 200;  // width (depth) of each step
  const STEP_DEPTH = 60;   // depth (tread) of each step
  const RISER_HEIGHT = 40;  // height of each riser
  const STEP_LENGTH = 300;  // length (side to side) of the staircase

  // Scale for tile texturing
  const SCALE = STEP_WIDTH / 1200; // Map 1200mm to the step width

  const getBackgroundStyle = (tile: VisTile | null | undefined) => {
    if (!tile || !tile.image_url) return { backgroundColor: "#e5e0d8" };

    const w = (tile.size_breadth || 600) * SCALE;
    const h = (tile.size_length || 600) * SCALE;

    return {
      backgroundImage: `url(${tile.image_url})`,
      backgroundSize: `${w}px ${h}px`,
      backgroundRepeat: "repeat" as const,
    };
  };

  const getGroutStyle = (tile: VisTile | null | undefined) => {
    if (!tile) return {};
    const w = (tile.size_breadth || 600) * SCALE;
    const h = (tile.size_length || 600) * SCALE;
    return {
      backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)`,
      backgroundSize: `${w}px ${h}px`,
    };
  };

  if (!stepTile && !riserTile) return null;

  const stepBg = stepTile ? getBackgroundStyle(stepTile) : { backgroundColor: "#d4cfc7" };
  const stepGrout = stepTile ? getGroutStyle(stepTile) : {};
  const riserBg = riserTile ? getBackgroundStyle(riserTile) : { backgroundColor: "#e8e4de" };
  const riserGrout = riserTile ? getGroutStyle(riserTile) : {};

  // Total staircase dimensions
  const totalHeight = displaySteps * RISER_HEIGHT;
  const totalDepth = displaySteps * STEP_DEPTH;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] w-[95vw] h-auto max-h-[94vh] p-0 rounded-xl overflow-hidden border-border/50 shadow-2xl bg-[#f8f6f3]">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/40 bg-card z-10 relative">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                3D Staircase Visualizer
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
                {staircaseName ? `${staircaseName} · ` : ""}
                {stepTile ? `Steps: ${stepTile.code}` : ""}
                {stepTile && riserTile ? " · " : ""}
                {riserTile ? `Risers: ${riserTile.code}` : ""}
                {numberOfSteps > displaySteps ? ` · Showing ${displaySteps} of ${numberOfSteps} steps` : ""}
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
          </div>
        </DialogHeader>

        {/* 3D Scene Container */}
        <div
          className="relative w-full h-[65vh] overflow-hidden cursor-move bg-gradient-to-br from-[#eae6df] to-[#d8d4cd]"
          style={{ perspective: "1200px" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Staircase 3D Container */}
          <div
            className="absolute top-1/2 left-1/2"
            style={{
              transformStyle: "preserve-3d",
              transform: `translate(-50%, -50%) scale(${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(-${totalDepth / 2}px)`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
              width: `${STEP_LENGTH}px`,
              height: `${totalHeight}px`,
            }}
          >
            {/* Render each step from bottom to top */}
            {Array.from({ length: displaySteps }).map((_, idx) => {
              // idx 0 = bottom step, idx displaySteps-1 = top step
              const stepIndex = idx;
              // Position: each step is offset up and back
              const yOffset = (displaySteps - 1 - stepIndex) * RISER_HEIGHT;
              const zOffset = stepIndex * STEP_DEPTH;

              return (
                <div
                  key={stepIndex}
                  style={{
                    transformStyle: "preserve-3d",
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: `${STEP_LENGTH}px`,
                    height: `${RISER_HEIGHT}px`,
                    transform: `translateY(-${yOffset}px) translateZ(${zOffset}px)`,
                  }}
                >
                  {/* STEP TOP (horizontal surface - where you walk) */}
                  <div
                    style={{
                      position: "absolute",
                      width: `${STEP_LENGTH}px`,
                      height: `${STEP_DEPTH}px`,
                      top: 0,
                      left: 0,
                      transformOrigin: "top left",
                      transform: "rotateX(90deg)",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <div className="absolute inset-0" style={stepBg} />
                    {stepTile && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={stepGrout}
                      />
                    )}
                    {/* Subtle shadow at the back edge of the step */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 30%, transparent 80%, rgba(0,0,0,0.04) 100%)",
                      }}
                    />
                  </div>

                  {/* RISER FACE (vertical front face) */}
                  <div
                    style={{
                      position: "absolute",
                      width: `${STEP_LENGTH}px`,
                      height: `${RISER_HEIGHT}px`,
                      top: 0,
                      left: 0,
                      transform: `translateZ(${STEP_DEPTH}px)`,
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <div className="absolute inset-0" style={riserBg} />
                    {riserTile && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={riserGrout}
                      />
                    )}
                    {/* Subtle lighting gradient */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 40%, rgba(0,0,0,0.08) 100%)",
                      }}
                    />
                  </div>

                  {/* LEFT SIDE of the step (side panel) */}
                  <div
                    style={{
                      position: "absolute",
                      width: `${STEP_DEPTH}px`,
                      height: `${RISER_HEIGHT}px`,
                      top: 0,
                      left: 0,
                      transformOrigin: "top left",
                      transform: "rotateY(-90deg)",
                      backgroundColor: "#cbc7c0",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)",
                      }}
                    />
                  </div>

                  {/* RIGHT SIDE of the step (side panel) */}
                  <div
                    style={{
                      position: "absolute",
                      width: `${STEP_DEPTH}px`,
                      height: `${RISER_HEIGHT}px`,
                      top: 0,
                      right: 0,
                      transformOrigin: "top right",
                      transform: "rotateY(90deg)",
                      backgroundColor: "#d5d1ca",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to left, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.03) 100%)",
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Floor at the bottom of the staircase */}
            <div
              style={{
                position: "absolute",
                width: `${STEP_LENGTH + 80}px`,
                height: `${totalDepth + 120}px`,
                bottom: 0,
                left: -40,
                transformOrigin: "bottom left",
                transform: `translateY(${RISER_HEIGHT}px) rotateX(90deg)`,
                backgroundColor: "#ddd9d2",
                backfaceVisibility: "hidden",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(0,0,0,0.1) 100%)",
                }}
              />
            </div>
          </div>

          {/* Ambient lighting overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/40 bg-card z-10 relative">
          <p className="text-xs text-muted-foreground text-center font-medium">
            CSS 3D Staircase · Drag to rotate · Scroll to zoom · Step & Riser tile preview
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
