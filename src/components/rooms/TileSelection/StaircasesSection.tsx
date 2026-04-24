import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footprints, Layers } from "lucide-react";
import type { Staircase } from "@/hooks/useStaircases";
import type { Tile } from "@/hooks/useTiles";
import type { StaircaseTileSelection as StaircaseTileSelectionType } from "@/utils/tileCalculations";

interface StaircasesSectionProps {
  staircases: Staircase[];
  staircaseTileSelectionsState: StaircaseTileSelectionType[];
  tiles: Tile[];
  handleSelectStaircaseTile: (staircaseId: string, tileType: 'step' | 'riser') => void;
}

export const StaircasesSection = ({ 
  staircases, 
  staircaseTileSelectionsState, 
  tiles, 
  handleSelectStaircaseTile 
}: StaircasesSectionProps) => {
  if (staircases.length === 0) return null;
  return (
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

          return (
            <div key={staircase.id} className="border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-base text-foreground">{staircase.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {staircase.number_of_steps} Steps, {staircase.number_of_risers} Risers
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Steps Selection */}
                <div className="flex items-center justify-between bg-card p-2 rounded border border-border">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/15 p-1.5 rounded">
                      <Footprints className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Steps</p>
                      {stepTile ? (
                        <p className="text-xs text-primary font-medium">{stepTile.code}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/70 italic">Not selected</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectStaircaseTile(staircase.id, 'step')}
                  >
                    {stepTile ? 'Change' : 'Select'}
                  </Button>
                </div>

                {/* Risers Selection */}
                <div className="flex items-center justify-between bg-card p-2 rounded border border-border">
                  <div className="flex items-center gap-2">
                    <div className="bg-muted p-1.5 rounded">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Risers</p>
                      {riserTile ? (
                        <p className="text-xs text-primary font-medium">{riserTile.code}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/70 italic">Not selected</p>
                      )}
                    </div>
                  </div>
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
          );
        })}
      </CardContent>
    </Card>
  );
};
