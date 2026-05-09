import { Ruler, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FeetInchInput } from '@/components/ui/feet-inches-input';
import type { CanvasRoomShape } from '@/types/canvas.types';
import { calculateCanvasArea, calculateCanvasPerimeter } from '@/utils/canvasShapeEngine';

interface CanvasAreaSummaryProps {
  shape: CanvasRoomShape;
  onHeightChange: (height: number | null) => void;
  disabled?: boolean;
}

/**
 * Displays computed area, perimeter, and an input for wall height.
 * Only shows when the unit ratio is established (at least one measurement entered).
 */
export function CanvasAreaSummary({
  shape,
  onHeightChange,
  disabled,
}: CanvasAreaSummaryProps) {
  const area = calculateCanvasArea(shape);
  const perimeter = calculateCanvasPerimeter(shape);
  const hasRatio = shape.unitRatio !== null;

  const unitAbbr =
    shape.unit === 'feet' ? 'ft' : shape.unit === 'metre' ? 'm' : shape.unit === 'inches' ? 'in' : 'mm';

  if (!hasRatio || shape.cells.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/70 text-center py-2 italic">
        Enter an edge measurement to see area calculations
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Area & Perimeter */}
      <div className="p-2.5 rounded-lg border bg-primary/5 border-primary/20">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
          <Ruler className="h-3.5 w-3.5 text-primary" />
          Shape Measurements
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Floor Area
            </span>
            <span className="text-sm font-bold text-foreground">
              {area.toFixed(2)} {unitAbbr}²
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Perimeter
            </span>
            <span className="text-sm font-bold text-foreground">
              {perimeter.toFixed(2)} {unitAbbr}
            </span>
          </div>
        </div>
      </div>

      {/* Wall Height Input */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 border-border">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          Wall Height
        </span>
        <div className="flex-1 max-w-[120px] ml-auto">
          {shape.unit === 'feet' ? (
            <FeetInchInput
              value={shape.height !== null ? String(shape.height) : ''}
              onChange={(val) => {
                const parsed = parseFloat(val);
                onHeightChange(isNaN(parsed) || parsed <= 0 ? null : parsed);
              }}
              placeholder="0 0"
              disabled={disabled}
            />
          ) : (
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={shape.height !== null ? shape.height : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onHeightChange(null);
                } else {
                  const parsed = parseFloat(val);
                  onHeightChange(isNaN(parsed) || parsed <= 0 ? null : parsed);
                }
              }}
              placeholder={unitAbbr}
              disabled={disabled}
              className="h-8 text-xs"
            />
          )}
        </div>
      </div>

      {/* Optional hint about wall */}
      {shape.height === null && (
        <p className="text-[10px] text-muted-foreground/60 text-center">
          Optional — leave blank if no wall tiles needed
        </p>
      )}
    </div>
  );
}
