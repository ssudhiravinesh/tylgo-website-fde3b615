import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Trash2, Undo2, Grid3X3 } from 'lucide-react';

interface CanvasToolbarProps {
  cellCount: number;
  onClear: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

/**
 * Toolbar for the canvas grid — clear all, undo, and status display.
 */
export function CanvasToolbar({
  cellCount,
  onClear,
  onUndo,
  canUndo,
  disabled,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Grid3X3 className="h-3.5 w-3.5" />
        <span>
          {cellCount === 0
            ? 'Tap cells to draw room shape'
            : `${cellCount} cell${cellCount !== 1 ? 's' : ''} painted`}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={disabled || !canUndo}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Undo last action</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={disabled || cellCount === 0}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Clear all cells</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
