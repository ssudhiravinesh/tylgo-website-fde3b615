/**
 * Shared component for displaying room dimensions.
 * 
 * Replaces duplicate `renderRoomDimensions` implementations in
 * TileSelectionStep.tsx and CustomerRoomManagement.tsx.
 * 
 * Updated for unified room model: rooms can have both floor and wall surfaces.
 */

import { Layers, Ruler } from "lucide-react";
import { formatArea, decimalFeetToFeetInches, calculateAreaInSquareFeet } from "@/utils/unitConversions";
import type { Room } from "@/hooks/useRooms";

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
