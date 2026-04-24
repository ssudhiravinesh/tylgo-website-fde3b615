/**
 * Shared component for displaying room dimensions.
 * 
 * Replaces duplicate `renderRoomDimensions` implementations in
 * TileSelectionStep.tsx and CustomerRoomManagement.tsx.
 */

import { Layers, Ruler } from "lucide-react";
import { formatArea, decimalFeetToFeetInches, calculateAreaInSquareFeet } from "@/utils/unitConversions";
import type { Room } from "@/hooks/useRooms";

interface RoomDimensionsProps {
  room: Room;
  /** 'compact' for tile selection lists, 'detailed' for room management cards */
  variant?: 'compact' | 'detailed';
}

export const RoomDimensions = ({ room, variant = 'compact' }: RoomDimensionsProps) => {
  const formatVal = (val: number | string) => {
    if (room.unit === 'feet') return decimalFeetToFeetInches(Number(val));
    return `${val} ${room.unit}`;
  };

  const isFloor = room.room_type === "floor";
  const length = isFloor ? room.length : (room.wall_length || room.length);
  const width = isFloor ? room.width : (room.wall_height || room.width);

  // Multi-shape rooms
  if (room.measurements && room.measurements.length > 0) {
    if (variant === 'detailed') {
      return (
        <div className="space-y-2 bg-muted p-2 rounded-md border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Dimensions ({room.measurements.length} Shapes)
            </span>
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
            {room.measurements.map((m: { length: string; width: string }, idx: number) => (
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
        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
          <Layers className="h-3 w-3" />
          <span>{room.measurements.length} Shapes</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto pr-1 bg-gray-50 rounded border border-gray-100 p-1.5">
          {room.measurements.map((m: { length: string; width: string }, idx: number) => (
            <div key={idx} className="flex justify-between text-xs border-b border-dashed border-gray-200 last:border-0 pb-0.5 last:pb-0">
              <span className="text-gray-500 mr-2">#{idx + 1}:</span>
              <span className="font-mono font-medium text-gray-700">
                {formatVal(m.length)} × {formatVal(m.width)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 font-medium mt-1">
          Total: {formatArea(calculateAreaInSquareFeet(
            length || 0,
            width || 0,
            room.unit
          ))}
        </p>
      </div>
    );
  }

  // Single-shape rooms
  if (variant === 'detailed') {
    const lLabel = isFloor ? "Length" : "Length";
    const wLabel = isFloor ? "Width" : "Height";

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

  // Compact variant for single shape
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
