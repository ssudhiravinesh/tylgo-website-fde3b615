import { memo } from 'react';

interface GridCellProps {
  row: number;
  col: number;
  isActive: boolean;
  isDisconnected: boolean;
  disabled?: boolean;
}

/**
 * Individual grid cell — the paint target.
 *
 * Pointer events are handled at the grid container level via
 * onPointerMove + elementFromPoint for reliable touch drag support.
 * This component is purely visual + carries data-row/data-col attributes
 * for the container to read.
 *
 * Memoized to avoid re-rendering the entire grid on every cell change.
 */
export const GridCell = memo(function GridCell({
  row,
  col,
  isActive,
  isDisconnected,
  disabled,
}: GridCellProps) {
  return (
    <div
      data-row={row}
      data-col={col}
      data-grid-cell
      className={`
        border border-border/30 transition-colors duration-100
        select-none
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'}
        ${
          isActive
            ? isDisconnected
              ? 'bg-destructive/30 border-destructive/50 ring-1 ring-destructive/40'
              : 'bg-primary/25 border-primary/40'
            : 'bg-background hover:bg-muted/60 active:bg-primary/10'
        }
      `}
      style={{ minWidth: 0, minHeight: 0 }}
    />
  );
});
