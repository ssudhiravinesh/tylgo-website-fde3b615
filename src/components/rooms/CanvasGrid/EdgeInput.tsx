import { useRef, useEffect, useState, useCallback } from 'react';
import type { CanvasEdge } from '@/types/canvas.types';
import { computeCellDimensions, deriveEdgeLength } from '@/utils/canvasShapeEngine';

interface EdgeListProps {
  edges: CanvasEdge[];
  unitRatio: number | null;
  unit: string;
  onMeasure: (edgeId: string, value: number) => void;
  disabled?: boolean;
}

export function EdgeList({ edges, unitRatio, unit, onMeasure, disabled }: EdgeListProps) {
  if (edges.length === 0) return null;

  const unitAbbr = unit === 'feet' ? 'ft' : unit === 'metre' ? 'm' : unit === 'inches' ? 'in' : 'mm';
  const isFirstUnmeasured = unitRatio === null;

  // Compute cell dimensions for derived values
  const dims = unitRatio !== null ? computeCellDimensions(edges, unitRatio) : null;

  const hEdges = edges.filter(e => e.direction === 'h');
  const vEdges = edges.filter(e => e.direction === 'v');

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        Edge Measurements
        {isFirstUnmeasured && (
          <span className="text-primary animate-pulse text-[10px] font-normal">— enter one to set the scale</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {hEdges.map(edge => (
          <EdgeRow key={edge.id} edge={edge} unitRatio={unitRatio} dims={dims} unitAbbr={unitAbbr}
            isFirstUnmeasured={isFirstUnmeasured} onMeasure={onMeasure} disabled={disabled} />
        ))}
        {vEdges.map(edge => (
          <EdgeRow key={edge.id} edge={edge} unitRatio={unitRatio} dims={dims} unitAbbr={unitAbbr}
            isFirstUnmeasured={isFirstUnmeasured} onMeasure={onMeasure} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

// ─── Edge row ───────────────────────────────────────────────────────────────

interface EdgeRowProps {
  edge: CanvasEdge;
  unitRatio: number | null;
  dims: ReturnType<typeof computeCellDimensions> | null;
  unitAbbr: string;
  isFirstUnmeasured: boolean;
  onMeasure: (edgeId: string, value: number) => void;
  disabled?: boolean;
}

function EdgeRow({ edge, unitRatio, dims, unitAbbr, isFirstUnmeasured, onMeasure, disabled }: EdgeRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState<string>(edge.length !== null ? String(edge.length) : '');

  useEffect(() => { setLocalValue(edge.length !== null ? String(edge.length) : ''); }, [edge.length]);

  const commitValue = useCallback(() => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed) && parsed > 0) onMeasure(edge.id, parsed);
  }, [localValue, edge.id, onMeasure]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitValue(); inputRef.current?.blur(); }
  };

  const isHorizontal = edge.direction === 'h';
  const hasValue = edge.length !== null;

  // Derived value using cell dimensions (constraint-aware)
  const derivedValue = edge.length === null && dims && unitRatio !== null
    ? deriveEdgeLength(edge, dims, unitRatio).toFixed(1)
    : null;

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors
      ${hasValue ? 'bg-primary/5 border-primary/20' : isFirstUnmeasured ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50'}`}>
      <div className="flex items-center gap-1 min-w-[52px]">
        <span className={`text-xs font-bold ${hasValue ? 'text-primary' : 'text-muted-foreground'}`}>
          {isHorizontal ? '↔' : '↕'}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {edge.cells} cell{edge.cells > 1 ? 's' : ''}
        </span>
      </div>
      <input ref={inputRef} type="number" inputMode="decimal" step="any" min="0"
        value={localValue} onChange={e => setLocalValue(e.target.value)}
        onBlur={commitValue} onKeyDown={handleKeyDown} disabled={disabled}
        placeholder={derivedValue ?? unitAbbr}
        className={`flex-1 h-7 min-w-0 text-xs text-center font-medium rounded border bg-background shadow-sm
          outline-none transition-all duration-150 placeholder:text-muted-foreground/40
          focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-40
          ${isFirstUnmeasured && !hasValue ? 'border-primary/50 ring-1 ring-primary/20' : hasValue ? 'border-primary/30 font-semibold' : 'border-border/60'}`}
      />
      <span className="text-[10px] text-muted-foreground font-medium min-w-[16px]">{unitAbbr}</span>
    </div>
  );
}
