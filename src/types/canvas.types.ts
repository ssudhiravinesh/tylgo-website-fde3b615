/**
 * Canvas Grid Room Builder — Type Definitions
 *
 * The canvas stores cell positions, edge segments with measurements,
 * and a single unitRatio locked from the first measurement.
 * Subsequent measurements morph column/row widths relative to this ratio.
 */

/** A single painted cell on the grid. */
export interface CanvasCell {
  row: number;
  col: number;
}

/** A merged edge segment on the boundary of the painted shape. */
export interface CanvasEdge {
  id: string;
  direction: 'h' | 'v';
  /** Number of grid cells this edge spans in the ORIGINAL drawn shape */
  cells: number;
  /** Real-world measurement entered by the user. null = not yet entered */
  length: number | null;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** Complete canvas room shape state. */
export interface CanvasRoomShape {
  cells: CanvasCell[];
  edges: CanvasEdge[];
  /** Real-world units per original grid cell. Locked on first measurement. */
  unitRatio: number | null;
  height: number | null;
  unit: 'feet' | 'metre' | 'inches' | 'mm';
}
