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

  // Interleave H and V edges row-by-row so Tab order is H1→V1→H2→V2→…
  // This matches the natural eye-scan and Tally-style keyboard navigation.
  const maxLen = Math.max(hEdges.length, vEdges.length);
  const rows = Array.from({ length: maxLen }, (_, i) => ({
    h: hEdges[i] ?? null,
    v: vEdges[i] ?? null,
  }));

  const hasH = hEdges.length > 0;
  const hasV = vEdges.length > 0;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        Edge Measurements
        {isFirstUnmeasured && (
          <span className="text-primary animate-pulse text-[10px] font-normal">— enter one to set the scale</span>
        )}
      </div>

      {/* Column headers */}
      {(hasH || hasV) && (
        <div data-edge-list className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hasH && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-0.5 border-b border-border/40">
              <span className="text-primary">↔</span> Horizontal Sides
            </div>
          )}
          {hasV && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-0.5 border-b border-border/40">
              <span className="text-primary">↕</span> Vertical Sides
            </div>
          )}
        </div>
      )}

      {/* Interleaved rows — DOM order: H1, V1, H2, V2, … for correct Tab flow */}
      {rows.map((row, i) => (
        <div key={i} data-edge-list className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            {row.h && (
              <EdgeRow edge={row.h} unitRatio={unitRatio} dims={dims} unitAbbr={unitAbbr}
                isFirstUnmeasured={isFirstUnmeasured} onMeasure={onMeasure} disabled={disabled} />
            )}
          </div>
          <div>
            {row.v && (
              <EdgeRow edge={row.v} unitRatio={unitRatio} dims={dims} unitAbbr={unitAbbr}
                isFirstUnmeasured={isFirstUnmeasured} onMeasure={onMeasure} disabled={disabled} />
            )}
          </div>
        </div>
      ))}
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
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
      inputRef.current?.blur();
    } else if (e.key === 'Tab') {
      // Prevent default tab so we can commit first, then manually move focus.
      // Without this, blur fires → onMeasure → re-render → browser loses track of next focusable.
      e.preventDefault();
      commitValue();

      // Find all edge inputs by walking up to the nearest [data-edge-list] ancestors
      // then querying the shared parent that contains all of them.
      const current = inputRef.current;
      if (!current) return;

      // Walk up to find the outermost edge-list section (the space-y-2 div)
      let container: HTMLElement | null = current.parentElement;
      while (container && !container.dataset.edgeList) {
        const parent = container.parentElement;
        // Keep going up until we find a data-edge-list ancestor or the section root
        if (parent && (parent.dataset.edgeList || parent.querySelector('[data-edge-list]') === container)) {
          container = parent.closest('[class*="space-y-2"]') ?? parent;
          break;
        }
        container = parent;
      }

      // Collect all inputs inside the edge measurements section
      const section = current.closest('.space-y-2');
      if (!section) return;
      const inputs = Array.from(section.querySelectorAll<HTMLInputElement>('input:not([disabled])'));
      const idx = inputs.indexOf(current);
      const next = e.shiftKey ? inputs[idx - 1] : inputs[idx + 1];
      if (next) {
        // Use setTimeout to let any React state update settle before focusing
        setTimeout(() => next.focus(), 0);
      } else if (!e.shiftKey) {
        // Last edge input — fall through to the height input in CanvasAreaSummary.
        // We use document.querySelector because commitValue() might trigger a React re-render
        // that briefly detaches `current` from the DOM before closest() can find the ancestor.
        const heightInput = document.querySelector<HTMLInputElement>('[data-height-input]');
        if (heightInput) {
          setTimeout(() => heightInput.focus(), 0);
        }
      }
    }
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
      <input ref={inputRef} type="text" inputMode="decimal"
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
