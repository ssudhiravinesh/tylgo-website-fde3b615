/**
 * Shared component for displaying room dimensions.
 * 
 * Replaces duplicate `renderRoomDimensions` implementations in
 * TileSelectionStep.tsx and CustomerRoomManagement.tsx.
 * 
 * Updated for unified room model: rooms can have both floor and wall surfaces.
 */

import { Layers, Ruler, PenTool } from "lucide-react";
import { formatArea, decimalFeetToFeetInches, calculateAreaInSquareFeet } from "@/utils/unitConversions";
import { Badge } from "@/components/ui/badge";
import type { Room } from "@/hooks/useRooms";
import type { CanvasCell } from "@/types/canvas.types";
import { calculateCanvasArea, calculateCanvasPerimeter } from "@/utils/canvasShapeEngine";

interface RoomDimensionsProps {
  room: Room;
  /** 'compact' for tile selection lists, 'detailed' for room management cards */
  variant?: 'compact' | 'detailed';
  /** Show only a specific surface's dimensions */
  surface?: 'floor' | 'wall' | 'both';
}

export const RoomDimensions = ({ room, variant = 'compact', surface = 'both' }: RoomDimensionsProps) => {
  const formatVal = (val: number | string) => {
    if (room.unit === 'feet') return decimalFeetToFeetInches(Number(val));
    return `${val} ${room.unit}`;
  };

  // Determine which surfaces to show
  const showFloor = (surface === 'floor' || surface === 'both') && room.has_floor;
  const showWall = (surface === 'wall' || surface === 'both') && room.has_wall;

  // Render a measurement set list
  const renderMeasurements = (
    measurements: Array<{ length: string; width: string }>,
    label: string,
    lengthLabel: string,
    widthLabel: string,
  ) => {
    if (variant === 'detailed') {
      return (
        <div className="space-y-2 bg-muted p-2 rounded-md border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {label} ({measurements.length} {measurements.length === 1 ? 'Shape' : 'Shapes'})
            </span>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
            {measurements.map((m, idx) => (
              <div key={idx} className="flex justify-between text-sm border-b border-border last:border-0 pb-1 last:pb-0 border-dashed">
                <span className="text-muted-foreground text-xs">Shape {idx + 1}:</span>
                <span className="text-xs font-medium" style={{ fontFamily: "'Manrope', sans-serif", color: "black" }}>
                  {parseFloat(m.length).toFixed(2)} × {parseFloat(m.width).toFixed(2)} {room.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Compact variant
    return (
      <div className="space-y-1 mt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span>{label}: {measurements.length} {measurements.length === 1 ? 'Shape' : 'Shapes'}</span>
        </div>
        <div className="space-y-0.5 max-h-24 overflow-y-auto bg-card rounded-md border border-border/60 p-1.5 shadow-sm">
          {measurements.map((m, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs px-1.5 py-1 rounded-sm hover:bg-muted/50 transition-colors">
              <span className="text-muted-foreground font-medium">#{idx + 1}:</span>
              <span className="font-semibold text-foreground tracking-tight tabular-nums">
                {formatVal(m.length)} × {formatVal(m.width)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render a single dimension pair (legacy/simple rooms)
  const renderSingleDimension = (
    length: number | undefined,
    width: number | undefined,
    lLabel: string,
    wLabel: string,
  ) => {
    if (variant === 'detailed') {
      return (
        <div className="grid grid-cols-2 gap-2 text-sm bg-card p-2 rounded border border-dashed border-border">
          <div className="flex items-center gap-1">
            <Ruler className="h-3 w-3 text-muted-foreground/70" />
            <span className="text-muted-foreground text-xs">{lLabel}:</span>
          </div>
          <span className="font-medium text-right">{length} {room.unit}</span>

          <div className="flex items-center gap-1">
            <Ruler className="h-3 w-3 text-muted-foreground/70" />
            <span className="text-muted-foreground text-xs">{wLabel}:</span>
          </div>
          <span className="font-medium text-right">{width} {room.unit}</span>
        </div>
      );
    }

    return (
      <div>
        <p className="text-sm text-gray-600">
          {decimalFeetToFeetInches(length || 0)} × {decimalFeetToFeetInches(width || 0)}
        </p>
        <p className="text-xs text-gray-500">
          ({formatArea(calculateAreaInSquareFeet(length || 0, width || 0, room.unit))})
        </p>
      </div>
    );
  };

  // ── Canvas-mode display ────────────────────────────────────────────────────
  const isCanvasRoom =
    room.canvas_cells && Array.isArray(room.canvas_cells) && room.canvas_cells.length > 0;

  if (isCanvasRoom) {
    return <CanvasRoomDisplay room={room} variant={variant} />;
  }

  // ── Manual-mode display (existing logic) ──────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Floor dimensions */}
      {showFloor && (
        <>
          {room.measurements && Array.isArray(room.measurements) && room.measurements.length > 0 ? (
            renderMeasurements(room.measurements, 'Floor', 'Length', 'Width')
          ) : room.length > 0 ? (
            renderSingleDimension(room.length, room.width, 'Length', 'Width')
          ) : null}
        </>
      )}

      {/* Wall dimensions */}
      {showWall && (
        <>
          {room.wall_measurements && Array.isArray(room.wall_measurements) && room.wall_measurements.length > 0 ? (
            renderMeasurements(room.wall_measurements, 'Wall', 'Perimeter', 'Height')
          ) : room.wall_length && room.wall_height ? (
            renderSingleDimension(room.wall_length, room.wall_height, 'Perimeter', 'Height')
          ) : null}
        </>
      )}
    </div>
  );
};

// ─── Canvas Room Display Sub-component ──────────────────────────────────────

function CanvasRoomDisplay({ room, variant }: { room: Room; variant: 'compact' | 'detailed' }) {
  const cells = room.canvas_cells as CanvasCell[];
  const unitAbbr =
    room.unit === 'feet' ? 'ft' : room.unit === 'metre' ? 'm' : room.unit === 'inches' ? 'in' : 'mm';

  // Build canvas shape for calculations
  const shape = {
    cells,
    edges: (room.canvas_edges ?? []) as any[],
    unitRatio: room.canvas_unit_ratio ?? null,
    height: room.wall_height ?? null,
    unit: room.unit,
  };

  const area = calculateCanvasArea(shape);
  const perimeter = calculateCanvasPerimeter(shape);

  // Compute bounding box for SVG mini-preview
  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;
  for (const { row, col } of cells) {
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  }
  const gridW = maxCol - minCol + 1;
  const gridH = maxRow - minRow + 1;


  const svgCellSize = variant === 'detailed' ? 8 : 6;
  const svgGap = 1;
  const svgW = gridW * (svgCellSize + svgGap) - svgGap;
  const svgH = gridH * (svgCellSize + svgGap) - svgGap;

  return (
    <div className="space-y-2">
      {/* Badge + Mini shape */}
      <div className="flex items-start gap-2">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="shrink-0 mt-0.5"
          aria-label="Room shape preview"
        >
          {cells.map(({ row, col }) => (
            <rect
              key={`${row}-${col}`}
              x={(col - minCol) * (svgCellSize + svgGap)}
              y={(row - minRow) * (svgCellSize + svgGap)}
              width={svgCellSize}
              height={svgCellSize}
              rx={1}
              className="fill-primary/30 stroke-primary/50"
              strokeWidth={0.5}
            />
          ))}
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
              <PenTool className="h-2.5 w-2.5" />
              Canvas
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Area</span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {area.toFixed(2)} {unitAbbr}²
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Perimeter</span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {perimeter.toFixed(2)} {unitAbbr}
              </span>
            </div>
            {room.wall_height && room.wall_height > 0 && (
              <div className="flex flex-col col-span-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Wall Height</span>
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {room.unit === 'feet' ? decimalFeetToFeetInches(room.wall_height) : `${room.wall_height} ${unitAbbr}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
