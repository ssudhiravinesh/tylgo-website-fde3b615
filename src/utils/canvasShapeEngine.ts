/**
 * Canvas Shape Engine — Pure Functions
 *
 * This module is the computational brain of the canvas grid room builder.
 * Every function here is pure (no React, no side effects) and designed
 * to be testable in isolation.
 *
 * Responsibilities:
 * - Edge detection from painted cells
 * - Measurement scaling (unit ratio lock)
 * - Area calculation via Shoelace formula
 * - Perimeter calculation
 * - Shape validation (contiguity, no holes)
 * - Ordered vertex extraction for polygon rendering
 */

import type { CanvasCell, CanvasEdge, CanvasRoomShape } from '@/types/canvas.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a lookup key for a cell position. */
const cellKey = (row: number, col: number): string => `${row},${col}`;

/** Parse a cell key back into [row, col]. */
const parseKey = (key: string): [number, number] => {
  const [r, c] = key.split(',').map(Number);
  return [r, c];
};

/** Build a Set<string> from an array of CanvasCell for O(1) lookups. */
export const buildCellSet = (cells: CanvasCell[]): Set<string> =>
  new Set(cells.map(c => cellKey(c.row, c.col)));

/** Convert a Set<string> back to CanvasCell[]. */
export const cellSetToArray = (cellSet: Set<string>): CanvasCell[] =>
  Array.from(cellSet).map(key => {
    const [row, col] = parseKey(key);
    return { row, col };
  });

// Direction offsets: [dRow, dCol]
const NEIGHBORS: [number, number][] = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

// ─── 3A. Edge Detection ─────────────────────────────────────────────────────

/**
 * Detect all exterior edges from a set of painted cells.
 *
 * Algorithm:
 * 1. For every painted cell, check 4 neighbors
 * 2. If neighbor is NOT painted → that boundary is exposed
 * 3. Collect all unit-length boundary segments
 * 4. Merge collinear adjacent segments into edges
 *
 * For horizontal edges (top/bottom):
 *   - "top" of cell (r,c) = edge at y=r, from x=c to x=c+1
 *   - "bottom" of cell (r,c) = edge at y=r+1, from x=c to x=c+1
 *
 * For vertical edges (left/right):
 *   - "left" of cell (r,c) = edge at x=c, from y=r to y=r+1
 *   - "right" of cell (r,c) = edge at x=c+1, from y=r to y=r+1
 */
export function detectEdges(cells: CanvasCell[]): CanvasEdge[] {
  if (cells.length === 0) return [];

  const cellLookup = buildCellSet(cells);

  // Collect raw boundary segments, normalizing to edge coordinates
  const hSegments: Map<string, { edgeRow: number; colStart: number }> = new Map();
  const vSegments: Map<string, { edgeCol: number; rowStart: number }> = new Map();

  for (const { row, col } of cells) {
    // Top boundary: neighbor at (row-1, col) missing
    if (!cellLookup.has(cellKey(row - 1, col))) {
      const key = `${row},${col}`; // edgeRow=row, colStart=col
      hSegments.set(key, { edgeRow: row, colStart: col });
    }
    // Bottom boundary: neighbor at (row+1, col) missing
    if (!cellLookup.has(cellKey(row + 1, col))) {
      const key = `${row + 1},${col}`; // edgeRow=row+1, colStart=col
      hSegments.set(key, { edgeRow: row + 1, colStart: col });
    }
    // Left boundary: neighbor at (row, col-1) missing
    if (!cellLookup.has(cellKey(row, col - 1))) {
      const key = `${row},${col}`; // edgeCol=col, rowStart=row
      vSegments.set(key, { edgeCol: col, rowStart: row });
    }
    // Right boundary: neighbor at (row, col+1) missing
    if (!cellLookup.has(cellKey(row, col + 1))) {
      const key = `${row},${col + 1}`; // edgeCol=col+1, rowStart=row
      vSegments.set(key, { edgeCol: col + 1, rowStart: row });
    }
  }

  const edges: CanvasEdge[] = [];

  // Merge horizontal segments
  // Group by edgeRow, then merge consecutive colStarts
  const hByRow = new Map<number, number[]>();
  for (const { edgeRow, colStart } of hSegments.values()) {
    if (!hByRow.has(edgeRow)) hByRow.set(edgeRow, []);
    hByRow.get(edgeRow)!.push(colStart);
  }

  for (const [edgeRow, cols] of hByRow) {
    cols.sort((a, b) => a - b);
    let start = cols[0];
    let end = cols[0] + 1; // edge goes from col to col+1

    for (let i = 1; i < cols.length; i++) {
      if (cols[i] === end) {
        // Adjacent — extend
        end = cols[i] + 1;
      } else {
        // Gap — flush current edge
        edges.push({
          id: `h-${edgeRow}-${start}-${edgeRow}-${end}`,
          direction: 'h',
          cells: end - start,
          length: null,
          startRow: edgeRow,
          startCol: start,
          endRow: edgeRow,
          endCol: end,
        });
        start = cols[i];
        end = cols[i] + 1;
      }
    }
    // Flush last edge
    edges.push({
      id: `h-${edgeRow}-${start}-${edgeRow}-${end}`,
      direction: 'h',
      cells: end - start,
      length: null,
      startRow: edgeRow,
      startCol: start,
      endRow: edgeRow,
      endCol: end,
    });
  }

  // Merge vertical segments
  // Group by edgeCol, then merge consecutive rowStarts
  const vByCol = new Map<number, number[]>();
  for (const { edgeCol, rowStart } of vSegments.values()) {
    if (!vByCol.has(edgeCol)) vByCol.set(edgeCol, []);
    vByCol.get(edgeCol)!.push(rowStart);
  }

  for (const [edgeCol, rows] of vByCol) {
    rows.sort((a, b) => a - b);
    let start = rows[0];
    let end = rows[0] + 1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i] === end) {
        end = rows[i] + 1;
      } else {
        edges.push({
          id: `v-${start}-${edgeCol}-${end}-${edgeCol}`,
          direction: 'v',
          cells: end - start,
          length: null,
          startRow: start,
          startCol: edgeCol,
          endRow: end,
          endCol: edgeCol,
        });
        start = rows[i];
        end = rows[i] + 1;
      }
    }
    edges.push({
      id: `v-${start}-${edgeCol}-${end}-${edgeCol}`,
      direction: 'v',
      cells: end - start,
      length: null,
      startRow: start,
      startCol: edgeCol,
      endRow: end,
      endCol: edgeCol,
    });
  }

  return edges;
}

/**
 * Preserve existing edge measurements when edges are recalculated.
 * Matches edges by ID — if the same edge still exists, carry over its length.
 */
export function preserveEdgeMeasurements(
  newEdges: CanvasEdge[],
  oldEdges: CanvasEdge[]
): CanvasEdge[] {
  const oldMap = new Map(oldEdges.map(e => [e.id, e]));
  return newEdges.map(edge => {
    const old = oldMap.get(edge.id);
    if (old && old.length !== null) {
      return { ...edge, length: old.length };
    }
    return edge;
  });
}

// ─── 3B. Scale Engine ───────────────────────────────────────────────────────

export interface MeasurementResult {
  edges: CanvasEdge[];
  unitRatio: number;
}

/**
 * Apply a measurement. First measurement locks the ratio.
 * Subsequent measurements are stored directly — the ratio never changes.
 */
export function applyMeasurement(
  edges: CanvasEdge[],
  edgeId: string,
  value: number,
  currentRatio: number | null
): MeasurementResult {
  const idx = edges.findIndex(e => e.id === edgeId);
  if (idx === -1) throw new Error(`Edge not found: ${edgeId}`);

  const target = edges[idx];
  const updated = [...edges];
  updated[idx] = { ...target, length: value };

  // First measurement ever → lock the ratio
  const ratio = currentRatio ?? (value / target.cells);
  return { edges: updated, unitRatio: ratio };
}

/** Clear a measurement from an edge. */
export function clearMeasurement(edges: CanvasEdge[], edgeId: string): CanvasEdge[] {
  return edges.map(e => e.id === edgeId ? { ...e, length: null } : e);
}

/** Recalculate ratio from remaining measurements. Uses the first measured edge. */
export function recalculateRatio(edges: CanvasEdge[]): number | null {
  const measured = edges.find(e => e.length !== null);
  if (!measured) return null;
  return measured.length! / measured.cells;
}

// ─── 3C. Cell Dimension Engine ──────────────────────────────────────────────

export interface CellDimensions {
  /** Real-world width for each column index */
  colWidths: Map<number, number>;
  /** Real-world height for each row index */
  rowHeights: Map<number, number>;
}

/**
 * Solve a set of linear constraints over integer-indexed variables.
 *
 * Each constraint says: sum of variables[indices[i]] = total.
 * Uses iterative propagation:
 *   Phase 1 — Solve any constraint with exactly 1 unknown (direct solve).
 *   Phase 2 — When stuck, distribute remaining unknowns evenly for the
 *             shortest partially-unknown constraint (heuristic for
 *             under-determined systems), then loop back to Phase 1.
 *
 * Guarantees convergence because each Phase-2 step reduces the unknown
 * count by at least 1, and Phase 1 never increases it.
 */
function solveLinearConstraints(
  constraints: Array<{ indices: number[]; total: number }>,
  values: Map<number, number>
): void {
  const MAX_ITER = 50;
  let iter = 0;

  while (iter < MAX_ITER) {
    iter++;

    // ── Phase 1: Exact solves (constraints with exactly 1 unknown) ──
    let exactProgress = true;
    while (exactProgress) {
      exactProgress = false;
      for (const constraint of constraints) {
        let knownSum = 0;
        const unknowns: number[] = [];
        for (const idx of constraint.indices) {
          if (values.has(idx)) knownSum += values.get(idx)!;
          else unknowns.push(idx);
        }
        if (unknowns.length === 1) {
          values.set(unknowns[0], constraint.total - knownSum);
          exactProgress = true;
        }
      }
    }

    // ── Phase 2: Distribute evenly for the shortest unsolved constraint ──
    let bestConstraint: { indices: number[]; total: number } | null = null;
    let bestUnknowns: number[] = [];
    let bestKnownSum = 0;

    for (const constraint of constraints) {
      let knownSum = 0;
      const unknowns: number[] = [];
      for (const idx of constraint.indices) {
        if (values.has(idx)) knownSum += values.get(idx)!;
        else unknowns.push(idx);
      }
      // Need at least 2 unknowns (1-unknown case was handled in Phase 1)
      if (unknowns.length >= 2 && (!bestConstraint || unknowns.length < bestUnknowns.length)) {
        bestConstraint = constraint;
        bestUnknowns = unknowns;
        bestKnownSum = knownSum;
      }
    }

    if (!bestConstraint) break; // All constraints satisfied or no progress possible

    const remaining = bestConstraint.total - bestKnownSum;
    const perVar = remaining / bestUnknowns.length;
    for (const idx of bestUnknowns) values.set(idx, perVar);
    // Loop back — Phase 1 may now be able to solve more
  }
}

/**
 * Compute per-column widths and per-row heights from edge measurements.
 *
 * Uses iterative constraint propagation:
 * 1. Each measured horizontal edge → constraint: Σ colWidth[c] = edge.length
 * 2. Each measured vertical edge → constraint: Σ rowHeight[r] = edge.length
 * 3. Solve each axis independently using solveLinearConstraints()
 * 4. Un-covered cols/rows fall back to unitRatio
 *
 * This correctly handles L-shapes and composite rooms where the old
 * sequential single-pass approach produced inconsistent column widths.
 *
 * Example: L-shape with edges H1(cols 3-6) = 12ft, H2(cols 3-7) = 15ft:
 *   Phase 1: no 1-unknown constraints
 *   Phase 2: H1 is shortest → cols 3,4,5 = 4ft each
 *   Phase 1: H2 has 1 unknown (col 6) → col 6 = 15 - 12 = 3ft ✓
 */
export function computeCellDimensions(
  edges: CanvasEdge[],
  ratio: number
): CellDimensions {
  const colWidths = new Map<number, number>();
  const rowHeights = new Map<number, number>();

  // Build constraints from measured edges
  const colConstraints: Array<{ indices: number[]; total: number }> = [];
  const rowConstraints: Array<{ indices: number[]; total: number }> = [];

  for (const edge of edges) {
    if (edge.length === null) continue;

    if (edge.direction === 'h') {
      const indices: number[] = [];
      for (let c = edge.startCol; c < edge.endCol; c++) indices.push(c);
      colConstraints.push({ indices, total: edge.length });
    } else {
      const indices: number[] = [];
      for (let r = edge.startRow; r < edge.endRow; r++) indices.push(r);
      rowConstraints.push({ indices, total: edge.length });
    }
  }

  // Sort by span length — shorter constraints are more constrained, solve first
  colConstraints.sort((a, b) => a.indices.length - b.indices.length);
  rowConstraints.sort((a, b) => a.indices.length - b.indices.length);

  // Solve each axis independently
  solveLinearConstraints(colConstraints, colWidths);
  solveLinearConstraints(rowConstraints, rowHeights);

  return { colWidths, rowHeights };
}

/**
 * Derive the real-world length of an edge from cell dimensions.
 * Used for showing derived values on edges without explicit measurements.
 */
export function deriveEdgeLength(
  edge: CanvasEdge,
  dims: CellDimensions,
  ratio: number
): number {
  if (edge.direction === 'h') {
    let total = 0;
    for (let c = edge.startCol; c < edge.endCol; c++) {
      total += dims.colWidths.get(c) ?? ratio;
    }
    return total;
  } else {
    let total = 0;
    for (let r = edge.startRow; r < edge.endRow; r++) {
      total += dims.rowHeights.get(r) ?? ratio;
    }
    return total;
  }
}

// ─── 3D. Area Calculator ────────────────────────────────────────────────────

/**
 * Calculate floor area using per-cell dimensions.
 * Each cell's area = its column width × its row height.
 */
export function calculateCanvasArea(shape: CanvasRoomShape): number {
  if (!shape.unitRatio || shape.cells.length === 0) return 0;

  const dims = computeCellDimensions(shape.edges, shape.unitRatio);

  let area = 0;
  for (const { row, col } of shape.cells) {
    const w = dims.colWidths.get(col) ?? shape.unitRatio;
    const h = dims.rowHeights.get(row) ?? shape.unitRatio;
    area += w * h;
  }
  return area;
}

// ─── 3E. Perimeter Calculator ───────────────────────────────────────────────

/**
 * Calculate perimeter. Explicit measurements used directly.
 * Un-measured edges derive their length from cell dimensions.
 */
export function calculateCanvasPerimeter(shape: CanvasRoomShape): number {
  if (!shape.unitRatio || shape.edges.length === 0) return 0;

  const dims = computeCellDimensions(shape.edges, shape.unitRatio);

  return shape.edges.reduce((sum, edge) => {
    if (edge.length !== null) return sum + edge.length;
    return sum + deriveEdgeLength(edge, dims, shape.unitRatio!);
  }, 0);
}

// ─── 3E. Polygon Vertex Ordering ────────────────────────────────────────────

/**
 * Extract ordered vertices of the exterior boundary polygon.
 *
 * Walks the boundary edges in clockwise order to produce a vertex list.
 * This is needed for Shoelace area calculation and shape rendering.
 *
 * Algorithm:
 * 1. Build an adjacency map: vertex → list of connected vertices via edges
 * 2. Start at top-left vertex (minimum row, then minimum col)
 * 3. Walk clockwise: at each vertex, pick the next edge that makes the
 *    smallest clockwise angle from the incoming direction
 */
export function getOrderedVertices(
  edges: CanvasEdge[]
): Array<{ row: number; col: number }> {
  if (edges.length === 0) return [];

  // Build adjacency: vertex key → list of connected vertex keys
  const adjacency = new Map<string, string[]>();

  const addEdge = (from: string, to: string) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push(to);
  };

  for (const edge of edges) {
    const startKey = cellKey(edge.startRow, edge.startCol);
    const endKey = cellKey(edge.endRow, edge.endCol);
    addEdge(startKey, endKey);
    addEdge(endKey, startKey);
  }

  // Find starting vertex: top-left (min row, then min col)
  let startKey = '';
  let startRow = Infinity;
  let startCol = Infinity;

  for (const key of adjacency.keys()) {
    const [r, c] = parseKey(key);
    if (r < startRow || (r === startRow && c < startCol)) {
      startRow = r;
      startCol = c;
      startKey = key;
    }
  }

  // Walk the boundary clockwise
  const vertices: Array<{ row: number; col: number }> = [];
  const visited = new Set<string>(); // Track visited edge pairs
  let current = startKey;
  // Initial direction: we start at top-left, facing right (coming from above)
  let prevDr = -1; // came from above
  let prevDc = 0;

  const maxSteps = edges.length * 4; // safety limit
  let steps = 0;

  do {
    const [cr, cc] = parseKey(current);
    vertices.push({ row: cr, col: cc });

    const neighbors = adjacency.get(current) || [];

    // Score each neighbor by clockwise angle from incoming direction
    // Incoming direction = (prevDr, prevDc) → we came FROM that direction
    // So our "forward" is the direction we were walking: opposite of prev
    const forwardDr = -prevDr;
    const forwardDc = -prevDc;

    let bestNext = '';
    let bestAngle = Infinity;

    for (const neighbor of neighbors) {
      const edgeKey = `${current}->${neighbor}`;
      // Allow revisiting edges if needed for complex shapes,
      // but prefer unvisited ones
      const [nr, nc] = parseKey(neighbor);
      const dr = nr - cr;
      const dc = nc - cc;

      // Normalize direction to unit
      const len = Math.abs(dr) + Math.abs(dc);
      if (len === 0) continue;
      const ndr = dr / len;
      const ndc = dc / len;

      // Calculate clockwise angle from forward direction
      // Using atan2: angle = atan2(cross, dot)
      // Cross product (2D): forwardDc * ndr - forwardDr * ndc
      // Dot product: forwardDr * ndr + forwardDc * ndc
      const cross = forwardDc * ndr - forwardDr * ndc;
      const dot = forwardDr * ndr + forwardDc * ndc;
      let angle = Math.atan2(cross, dot);

      // Normalize to [0, 2π), but we want clockwise = smallest angle
      // In grid coords (y increases downward), clockwise is:
      // right → down → left → up
      // atan2 gives counter-clockwise in standard math coords
      // Since y is flipped, our cross product already gives clockwise
      if (angle < 0) angle += 2 * Math.PI;
      // Treat going straight (angle=0) as 2π to prefer turning
      if (Math.abs(angle) < 1e-10) angle = 2 * Math.PI;

      // Prefer unvisited edges
      const penalty = visited.has(edgeKey) ? 100 : 0;

      if (angle + penalty < bestAngle) {
        bestAngle = angle + penalty;
        bestNext = neighbor;
      }
    }

    if (!bestNext) break;

    const edgeKey = `${current}->${bestNext}`;
    visited.add(edgeKey);

    const [nr, nc] = parseKey(bestNext);
    prevDr = cr - nr; // direction we came from (current → bestNext, prev = current)
    prevDc = cc - nc;

    current = bestNext;
    steps++;
  } while (current !== startKey && steps < maxSteps);

  return vertices;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a canvas room shape for submission.
 *
 * Checks:
 * 1. At least 1 cell painted
 * 2. All cells are contiguous (connected via flood fill)
 * 3. Unit ratio is set (at least one measurement entered)
 * 4. All edges have measurements or can be derived from unitRatio
 * 5. No negative or zero measurements
 * 6. No interior holes (all non-painted cells reachable from exterior)
 */
export function validateShape(shape: CanvasRoomShape): ValidationResult {
  const errors: string[] = [];

  // 1. At least one cell
  if (shape.cells.length === 0) {
    errors.push('Draw at least one cell to define the room shape.');
    return { valid: false, errors };
  }

  // 2. Contiguity check (flood fill)
  if (!isContiguous(shape.cells)) {
    errors.push('All cells must be connected. Remove disconnected cells.');
  }

  // 3. Unit ratio must be set
  if (shape.unitRatio === null || shape.unitRatio <= 0) {
    errors.push('Enter at least one edge measurement to set the scale.');
  }

  // 4 & 5. Validate edge measurements
  for (const edge of shape.edges) {
    if (edge.length !== null && edge.length <= 0) {
      errors.push(`Edge ${edge.id} has an invalid measurement (must be > 0).`);
    }
  }

  // 6. No holes check
  if (shape.cells.length > 1 && hasHoles(shape.cells)) {
    errors.push('The shape cannot have holes. Fill in any gaps.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if all painted cells are connected (4-directional adjacency).
 * Uses BFS flood fill starting from the first cell.
 */
export function isContiguous(cells: CanvasCell[]): boolean {
  if (cells.length <= 1) return true;

  const cellSet = buildCellSet(cells);
  const visited = new Set<string>();
  const queue: string[] = [cellKey(cells[0].row, cells[0].col)];
  visited.add(queue[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const [row, col] = parseKey(current);

    for (const [dr, dc] of NEIGHBORS) {
      const nKey = cellKey(row + dr, col + dc);
      if (cellSet.has(nKey) && !visited.has(nKey)) {
        visited.add(nKey);
        queue.push(nKey);
      }
    }
  }

  return visited.size === cellSet.size;
}

/**
 * Check if the shape has interior holes.
 *
 * Algorithm: Flood fill from a cell known to be outside the shape.
 * Use the bounding box expanded by 1 cell on each side. If any
 * non-painted cell inside the bounding box is NOT reached by the
 * exterior flood fill, it's an interior hole.
 */
export function hasHoles(cells: CanvasCell[]): boolean {
  if (cells.length === 0) return false;

  const cellSet = buildCellSet(cells);

  // Find bounding box
  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;
  for (const { row, col } of cells) {
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  }

  // Expand by 1 to ensure we have an exterior starting point
  const expandedMinRow = minRow - 1;
  const expandedMaxRow = maxRow + 1;
  const expandedMinCol = minCol - 1;
  const expandedMaxCol = maxCol + 1;

  // BFS from top-left corner of expanded bbox (guaranteed to be exterior)
  const startKey = cellKey(expandedMinRow, expandedMinCol);
  const exteriorVisited = new Set<string>();
  const queue: string[] = [startKey];
  exteriorVisited.add(startKey);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const [row, col] = parseKey(current);

    for (const [dr, dc] of NEIGHBORS) {
      const nr = row + dr;
      const nc = col + dc;
      const nKey = cellKey(nr, nc);

      // Stay within expanded bounding box
      if (
        nr < expandedMinRow || nr > expandedMaxRow ||
        nc < expandedMinCol || nc > expandedMaxCol
      ) {
        continue;
      }

      // Don't cross painted cells
      if (cellSet.has(nKey)) continue;

      // Don't revisit
      if (exteriorVisited.has(nKey)) continue;

      exteriorVisited.add(nKey);
      queue.push(nKey);
    }
  }

  // Check: is there any non-painted cell inside the bbox that wasn't
  // reached from the exterior?
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = cellKey(r, c);
      if (!cellSet.has(key) && !exteriorVisited.has(key)) {
        return true; // Found a hole
      }
    }
  }

  return false;
}

// ─── Utility: Get effective edge length ─────────────────────────────────────

/**
 * Get the real-world length of an edge, using explicit measurement
 * if available, otherwise deriving from unitRatio.
 */
export function getEdgeLength(edge: CanvasEdge, unitRatio: number | null): number {
  if (edge.length !== null) return edge.length;
  if (unitRatio !== null) return edge.cells * unitRatio;
  return 0;
}
