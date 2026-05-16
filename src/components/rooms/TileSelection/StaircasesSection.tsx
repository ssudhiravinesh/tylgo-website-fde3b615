import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Footprints, Layers, Eye, Ruler, Package, Hash, Trash2 } from "lucide-react";
import { StaircaseVisualizer } from "@/components/rooms/StaircaseVisualizer";
import type { Staircase } from "@/hooks/useStaircases";
import type { Tile } from "@/hooks/useTiles";
import type { StaircaseTileSelection as StaircaseTileSelectionType } from "@/utils/tileCalculations";

interface StaircasesSectionProps {
  staircases: Staircase[];
  staircaseTileSelectionsState: StaircaseTileSelectionType[];
  tiles: Tile[];
  handleSelectStaircaseTile: (staircaseId: string, tileType: 'step' | 'riser') => void;
  handleRemoveStaircaseTile: (staircaseId: string, tileType: 'step' | 'riser') => void;
}

/**
 * Determine if a tile is 1:1 (square) ratio.
 * Square tiles (e.g., 600x600mm) → come in boxes
 * Non-square tiles (e.g., 300x900mm) → come loose
 */
const isTileSquare = (tile: Tile): boolean => {
  const length = tile.size_length || 0;
  const breadth = tile.size_breadth || 0;
  if (length === 0 || breadth === 0) return false;
  const ratio = Math.max(length, breadth) / Math.min(length, breadth);
  // Within 10% tolerance for "1:1" classification
  return ratio < 1.15;
};

/**
 * Get tiles needed per step/riser based on tile aspect ratio.
 * 1:1 tiles (e.g., 600x600mm): 3 tiles per unit (to cover a ~300x900 step surface)
 * Non-1:1 tiles (e.g., 300x900mm): 1 tile per unit
 */
const getTilesPerUnit = (tile: Tile): number => {
  const length = tile.size_length || 0;
  const breadth = tile.size_breadth || 0;
  if (length === 0 || breadth === 0) return 1;
  const ratio = Math.max(length, breadth) / Math.min(length, breadth);
  return ratio >= 2.5 ? 1 : 3;
};

/**
 * Render the tile quantity display for steps/risers.
 * - 1:1 tiles: show boxes + tiles per box
 * - Non-1:1 tiles: show just tile count (they come loose)
 */
const TileQuantityDisplay = ({
  tile,
  count,
  label,
}: {
  tile: Tile;
  count: number;
  label: string;
}) => {
  const tilesPerUnit = getTilesPerUnit(tile);
  const totalTiles = count * tilesPerUnit;
  const isSquare = isTileSquare(tile);
  const piecesPerBox = parseInt(tile.pieces_per_box?.toString() || '1');

  if (isSquare && piecesPerBox > 0) {
    // 1:1 tiles come in boxes
    const boxes = Math.ceil(totalTiles / piecesPerBox);
    const remainder = totalTiles % piecesPerBox;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
        <Package className="h-3 w-3 text-primary/70" />
        <span>
          <span className="font-medium text-foreground">{boxes}</span> {boxes === 1 ? 'box' : 'boxes'}
          <span className="text-muted-foreground/70"> ({piecesPerBox}/box)</span>
          {remainder > 0 && (
            <span className="text-muted-foreground/70"> · {remainder} extra</span>
          )}
        </span>
      </div>
    );
  }

  // Non-1:1 tiles come loose
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
      <Hash className="h-3 w-3 text-primary/70" />
      <span>
        <span className="font-medium text-foreground">{totalTiles}</span> {totalTiles === 1 ? 'tile' : 'tiles'}
        <span className="text-muted-foreground/70"> (loose)</span>
      </span>
    </div>
  );
};

export const StaircasesSection = ({ 
  staircases, 
  staircaseTileSelectionsState, 
  tiles, 
  handleSelectStaircaseTile,
  handleRemoveStaircaseTile
}: StaircasesSectionProps) => {
  const [visualizerData, setVisualizerData] = useState<{
    isOpen: boolean;
    stepTile: Tile | null;
    riserTile: Tile | null;
    staircaseName: string;
    numberOfSteps: number;
  }>({
    isOpen: false,
    stepTile: null,
    riserTile: null,
    staircaseName: '',
    numberOfSteps: 6,
  });

  if (staircases.length === 0) return null;

  const handleShowVisualizer = (staircase: Staircase, stepTile: Tile | null, riserTile: Tile | null) => {
    setVisualizerData({
      isOpen: true,
      stepTile,
      riserTile,
      staircaseName: staircase.name,
      numberOfSteps: staircase.number_of_steps,
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Footprints className="h-5 w-5 text-primary" />
            Staircases ({staircases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {staircases.map((staircase) => {
            const selection = staircaseTileSelectionsState.find((s) => s.staircaseId === staircase.id);
            const stepTile = selection?.stepTileId ? tiles.find((t) => t.id === selection?.stepTileId) : null;
            const riserTile = selection?.riserTileId ? tiles.find((t) => t.id === selection?.riserTileId) : null;
            const hasDimensions = !!(staircase.step_length || staircase.riser_height);
            const hasAnyTile = !!stepTile || !!riserTile;

            return (
              <div key={staircase.id} className="border rounded-lg p-4 bg-primary/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-base text-foreground">{staircase.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {staircase.number_of_steps} Steps, {staircase.number_of_risers} Risers
                    </p>
                  </div>
                  {/* 3D View Button */}
                  {hasAnyTile && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleShowVisualizer(staircase, stepTile || null, riserTile || null)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      3D View
                    </Button>
                  )}
                </div>

                {/* Step & Riser Dimensions */}
                {hasDimensions && (
                  <div className="space-y-1.5 mb-3">
                    {staircase.step_length && staircase.step_width && (
                      <div className="flex items-center justify-between bg-card px-2.5 py-1.5 rounded border border-border/60">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          Step:
                        </span>
                        <span className="text-xs font-medium tabular-nums text-foreground">
                          {staircase.step_length} × {staircase.step_width} {staircase.unit || 'mm'}
                        </span>
                      </div>
                    )}
                    {staircase.riser_height && staircase.riser_width && (
                      <div className="flex items-center justify-between bg-card px-2.5 py-1.5 rounded border border-border/60">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          Riser:
                        </span>
                        <span className="text-xs font-medium tabular-nums text-foreground">
                          {staircase.riser_height} × {staircase.riser_width} {staircase.unit || 'mm'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Steps Selection */}
                  <div className="flex items-center justify-between bg-card p-2 rounded border border-border">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="bg-primary/15 p-1.5 rounded">
                        <Footprints className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Steps</p>
                        {stepTile ? (
                          <>
                            <p className="text-xs text-primary font-medium">{stepTile.code}
                              {stepTile.size_length && stepTile.size_breadth && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  {stepTile.size_length}×{stepTile.size_breadth}mm
                                </span>
                              )}
                            </p>
                            <TileQuantityDisplay
                              tile={stepTile}
                              count={staircase.number_of_steps}
                              label="steps"
                            />
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground/70 italic">Not selected</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {stepTile && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveStaircaseTile(staircase.id, 'step')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectStaircaseTile(staircase.id, 'step')}
                      >
                        {stepTile ? 'Change' : 'Select'}
                      </Button>
                    </div>
                  </div>

                  {/* Risers Selection */}
                  <div className="flex items-center justify-between bg-card p-2 rounded border border-border">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="bg-muted p-1.5 rounded">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Risers</p>
                        {riserTile ? (
                          <>
                            <p className="text-xs text-primary font-medium">{riserTile.code}
                              {riserTile.size_length && riserTile.size_breadth && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  {riserTile.size_length}×{riserTile.size_breadth}mm
                                </span>
                              )}
                            </p>
                            <TileQuantityDisplay
                              tile={riserTile}
                              count={staircase.number_of_risers}
                              label="risers"
                            />
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground/70 italic">Not selected</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {riserTile && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveStaircaseTile(staircase.id, 'riser')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectStaircaseTile(staircase.id, 'riser')}
                      >
                        {riserTile ? 'Change' : 'Select'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3D Staircase Visualizer Dialog */}
      <StaircaseVisualizer
        isOpen={visualizerData.isOpen}
        onClose={() => setVisualizerData(prev => ({ ...prev, isOpen: false }))}
        stepTile={visualizerData.stepTile}
        riserTile={visualizerData.riserTile}
        staircaseName={visualizerData.staircaseName}
        numberOfSteps={visualizerData.numberOfSteps}
      />
    </>
  );
};
