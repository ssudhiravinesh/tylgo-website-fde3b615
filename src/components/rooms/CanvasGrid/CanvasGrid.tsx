import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { CanvasCell, CanvasEdge, CanvasRoomShape } from '@/types/canvas.types';
import {
  detectEdges,
  preserveEdgeMeasurements,
  applyMeasurement,
  recalculateRatio,
  buildCellSet,
  cellSetToArray,
  isContiguous,
  computeCellDimensions,
} from '@/utils/canvasShapeEngine';
import { GridCell } from './GridCell';
import { EdgeList } from './EdgeInput';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasAreaSummary } from './CanvasAreaSummary';

const GRID_COLS = 16;
const GRID_ROWS = 12;
const MIN_CELL_PX = 22;
const EDGE_PADDING = 40;
const SUBDIVISIONS = 10;

interface CanvasGridProps {
  initialShape?: CanvasRoomShape;
  unit: 'feet' | 'metre' | 'inches' | 'mm';
  onShapeChange: (shape: CanvasRoomShape) => void;
  disabled?: boolean;
}

interface HistoryEntry {
  cells: Set<string>;
  edges: CanvasEdge[];
  unitRatio: number | null;
}

export function CanvasGrid({ initialShape, unit, onShapeChange, disabled }: CanvasGridProps) {
  const [cells, setCells] = useState<Set<string>>(() =>
    initialShape?.cells.length ? buildCellSet(initialShape.cells) : new Set<string>()
  );
  const [edges, setEdges] = useState<CanvasEdge[]>(() => initialShape?.edges ?? []);
  const [unitRatio, setUnitRatio] = useState<number | null>(initialShape?.unitRatio ?? null);
  const [height, setHeight] = useState<number | null>(initialShape?.height ?? null);

  const isPaintingRef = useRef(false);
  const paintModeRef = useRef<'add' | 'erase'>('add');
  const lastPaintedCellRef = useRef<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [baseCellSize, setBaseCellSize] = useState(32);
  const prevUnitRef = useRef(unit);

  const cellsRef = useRef(cells); cellsRef.current = cells;
  const edgesRef = useRef(edges); edgesRef.current = edges;
  const unitRatioRef = useRef(unitRatio); unitRatioRef.current = unitRatio;
  const heightRef = useRef(height); heightRef.current = height;

  // ── Proportional column/row sizing (normalize-to-fit) ─────────────────
  //
  // Strategy: compute real-world sizes for every column/row, then scale
  // uniformly so the grid fits within its container (like object-fit: contain).
  // This prevents overflow no matter how extreme the measurements are.

  const { colWidths, rowHeights, gridWidth, gridHeight } = useMemo(() => {
    if (unitRatio === null || edges.length === 0) {
      // Uniform grid — no measurements yet
      const cw = Array(GRID_COLS).fill(baseCellSize) as number[];
      const rh = Array(GRID_ROWS).fill(baseCellSize) as number[];
      return { colWidths: cw, rowHeights: rh, gridWidth: GRID_COLS * baseCellSize, gridHeight: GRID_ROWS * baseCellSize };
    }

    const dims = computeCellDimensions(edges, unitRatio);

    // 1. Real-world size for every column and row
    //    Measured dimensions where available, unitRatio as fallback.
    //    Clamp to MIN_REAL to prevent negative/zero from conflicting measurements.
    const MIN_REAL = 0.01;
    const realCols = Array.from({ length: GRID_COLS }, (_, c) =>
      Math.max(MIN_REAL, dims.colWidths.get(c) ?? unitRatio)
    );
    const realRows = Array.from({ length: GRID_ROWS }, (_, r) =>
      Math.max(MIN_REAL, dims.rowHeights.get(r) ?? unitRatio)
    );

    // 2. Total real-world dimensions
    const totalRealW = realCols.reduce((a, b) => a + b, 0);
    const totalRealH = realRows.reduce((a, b) => a + b, 0);

    // 3. Available pixel space (uniform grid bounding box)
    const availW = GRID_COLS * baseCellSize;
    const availH = GRID_ROWS * baseCellSize;

    // 4. Uniform scale factor — contain mode (fit both axes, preserve proportions)
    const scale = Math.min(availW / totalRealW, availH / totalRealH);

    // 5. Convert to pixels, enforce minimum cell size
    const cw = realCols.map(w => Math.max(MIN_CELL_PX, Math.round(w * scale)));
    const rh = realRows.map(h => Math.max(MIN_CELL_PX, Math.round(h * scale)));

    return {
      colWidths: cw,
      rowHeights: rh,
      gridWidth: cw.reduce((a, b) => a + b, 0),
      gridHeight: rh.reduce((a, b) => a + b, 0),
    };
  }, [unitRatio, edges, baseCellSize]);

  // ── Disconnected cells ────────────────────────────────────────────────

  const disconnectedCells = useMemo(() => {
    if (cells.size <= 1) return new Set<string>();
    const arr = cellSetToArray(cells);
    if (isContiguous(arr)) return new Set<string>();
    const visited = new Set<string>();
    const components: Set<string>[] = [];
    const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const key of cells) {
      if (visited.has(key)) continue;
      const comp = new Set<string>();
      const q = [key]; visited.add(key);
      while (q.length) {
        const cur = q.shift()!; comp.add(cur);
        const [r, c] = cur.split(',').map(Number);
        for (const [dr, dc] of DIRS) { const nk = `${r+dr},${c+dc}`; if (cells.has(nk) && !visited.has(nk)) { visited.add(nk); q.push(nk); } }
      }
      components.push(comp);
    }
    components.sort((a, b) => b.size - a.size);
    const disc = new Set<string>();
    for (let i = 1; i < components.length; i++) for (const k of components[i]) disc.add(k);
    return disc;
  }, [cells]);

  // ── Responsive sizing ─────────────────────────────────────────────────

  useEffect(() => {
    const update = () => { if (containerRef.current) setBaseCellSize(Math.max(MIN_CELL_PX, Math.floor((containerRef.current.clientWidth - EDGE_PADDING * 2) / GRID_COLS))); };
    update();
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Unit change ───────────────────────────────────────────────────────

  useEffect(() => {
    if (prevUnitRef.current !== unit) {
      if (edgesRef.current.some(e => e.length !== null) && cellsRef.current.size > 0) {
        const fresh = edgesRef.current.map(e => ({ ...e, length: null }));
        setEdges(fresh); setUnitRatio(null);
        toast.warning('Unit changed — measurements reset.', { duration: 3000 });
        onShapeChange({ cells: cellSetToArray(cellsRef.current), edges: fresh, unitRatio: null, height: heightRef.current, unit });
      }
      prevUnitRef.current = unit;
    }
  }, [unit, onShapeChange]);

  // ── Emit / recalc / history ───────────────────────────────────────────

  const emitShape = useCallback((c: Set<string>, e: CanvasEdge[], r: number | null, h: number | null) => {
    onShapeChange({ cells: cellSetToArray(c), edges: e, unitRatio: r, height: h, unit });
  }, [onShapeChange, unit]);

  const recalcEdges = useCallback((newCells: Set<string>, oldEdges: CanvasEdge[]) =>
    preserveEdgeMeasurements(detectEdges(cellSetToArray(newCells)), oldEdges), []);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-19), { cells: new Set(cellsRef.current), edges: [...edgesRef.current], unitRatio: unitRatioRef.current }]);
  }, []);

  // ── Paint ─────────────────────────────────────────────────────────────

  const paintCell = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    if (lastPaintedCellRef.current === key) return;
    lastPaintedCellRef.current = key;
    const mode = paintModeRef.current;
    if (mode === 'add' && cellsRef.current.has(key)) return;
    if (mode === 'erase' && !cellsRef.current.has(key)) return;
    setCells(prev => {
      const next = new Set(prev);
      mode === 'erase' ? next.delete(key) : next.add(key);
      const ne = recalcEdges(next, edgesRef.current);
      const nr = ne.some(e => e.length !== null) ? recalculateRatio(ne) : unitRatioRef.current;
      setEdges(ne);
      if (next.size === 0) { setUnitRatio(null); emitShape(next, [], null, heightRef.current); }
      else { setUnitRatio(nr); emitShape(next, ne, nr, heightRef.current); }
      return next;
    });
  }, [recalcEdges, emitShape]);

  const getCellFromPoint = useCallback((cx: number, cy: number) => {
    const el = document.elementFromPoint(cx, cy);
    if (!el) return null;
    const cell = (el as HTMLElement).closest?.('[data-grid-cell]') as HTMLElement | null;
    if (!cell) return null;
    const r = parseInt(cell.dataset.row ?? '', 10), c = parseInt(cell.dataset.col ?? '', 10);
    return isNaN(r) || isNaN(c) ? null : { row: r, col: c };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || (e.button !== 0 && e.pointerType === 'mouse')) return;
    const t = getCellFromPoint(e.clientX, e.clientY); if (!t) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pushHistory();
    paintModeRef.current = cellsRef.current.has(`${t.row},${t.col}`) ? 'erase' : 'add';
    isPaintingRef.current = true; lastPaintedCellRef.current = null;
    paintCell(t.row, t.col);
  }, [disabled, getCellFromPoint, pushHistory, paintCell]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPaintingRef.current || disabled) return; e.preventDefault();
    const t = getCellFromPoint(e.clientX, e.clientY); if (t) paintCell(t.row, t.col);
  }, [disabled, getCellFromPoint, paintCell]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isPaintingRef.current) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    isPaintingRef.current = false; lastPaintedCellRef.current = null;
  }, []);

  const handlePointerCancel = useCallback(() => { isPaintingRef.current = false; lastPaintedCellRef.current = null; }, []);
  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  // ── Edge measurement ──────────────────────────────────────────────────

  const handleMeasure = useCallback((edgeId: string, value: number) => {
    if (disabled) return;
    try {
      const result = applyMeasurement(edgesRef.current, edgeId, value, unitRatioRef.current);
      setEdges(result.edges); setUnitRatio(result.unitRatio);
      emitShape(cellsRef.current, result.edges, result.unitRatio, heightRef.current);
    } catch (err) { console.error(err); }
  }, [disabled, emitShape]);

  const handleHeightChange = useCallback((h: number | null) => { setHeight(h); emitShape(cellsRef.current, edgesRef.current, unitRatioRef.current, h); }, [emitShape]);

  const handleClear = useCallback(() => { pushHistory(); setCells(new Set()); setEdges([]); setUnitRatio(null); setHeight(null); emitShape(new Set(), [], null, null); }, [pushHistory, emitShape]);

  const handleUndo = useCallback(() => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCells(last.cells); setEdges(last.edges); setUnitRatio(last.unitRatio);
    emitShape(last.cells, last.edges, last.unitRatio, heightRef.current);
  }, [history, emitShape]);

  const currentShape: CanvasRoomShape = useMemo(
    () => ({ cells: cellSetToArray(cells), edges, unitRatio, height, unit }), [cells, edges, unitRatio, height, unit]
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3" ref={containerRef}>
      <CanvasToolbar cellCount={cells.size} onClear={handleClear} onUndo={handleUndo} canUndo={history.length > 0} disabled={disabled} />

      <div
        className="relative border rounded-lg bg-muted/20 overflow-visible"
        style={{ padding: `${EDGE_PADDING}px`, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onContextMenu={handleContextMenu}
      >
        <div className="relative mx-auto" style={{
          display: 'grid',
          gridTemplateColumns: colWidths.map(w => `${w}px`).join(' '),
          gridTemplateRows: rowHeights.map(h => `${h}px`).join(' '),
          width: `${gridWidth}px`, height: `${gridHeight}px`,
        }}>
          {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, idx) => {
            const row = Math.floor(idx / GRID_COLS), col = idx % GRID_COLS;
            const key = `${row},${col}`;
            return <GridCell key={key} row={row} col={col} isActive={cells.has(key)} isDisconnected={disconnectedCells.has(key)} disabled={disabled} />;
          })}
        </div>

        {/* SVG edge highlights */}
        <svg className="absolute pointer-events-none" style={{ top: `${EDGE_PADDING}px`, left: '50%', transform: 'translateX(-50%)', width: `${gridWidth}px`, height: `${gridHeight}px` }} viewBox={`0 0 ${gridWidth} ${gridHeight}`}>
          {edges.map(edge => {
            const isH = edge.direction === 'h';
            // Compute pixel position from cumulative column/row widths
            const x1 = colWidths.slice(0, isH ? edge.startCol : edge.startCol).reduce((a, b) => a + b, 0);
            const y1 = rowHeights.slice(0, isH ? edge.startRow : edge.startRow).reduce((a, b) => a + b, 0);
            const x2 = colWidths.slice(0, isH ? edge.endCol : edge.endCol).reduce((a, b) => a + b, 0);
            const y2 = rowHeights.slice(0, isH ? edge.endRow : edge.endRow).reduce((a, b) => a + b, 0);
            return <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={edge.length !== null ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'}
              strokeWidth={edge.length !== null ? 2.5 : 1.5} strokeLinecap="round" />;
          })}
        </svg>
      </div>

      {cells.size > 0 && <EdgeList edges={edges} unitRatio={unitRatio} unit={unit} onMeasure={handleMeasure} disabled={disabled} />}

      {cells.size === 0 && <p className="text-[11px] text-muted-foreground/60 text-center leading-snug">Tap and drag to paint your room shape.<br />Tap a painted cell to erase it.</p>}

      <CanvasAreaSummary shape={currentShape} onHeightChange={handleHeightChange} disabled={disabled} />
    </div>
  );
}
