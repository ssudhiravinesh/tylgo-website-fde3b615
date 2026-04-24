/**
 * Dialogs used in TileSelectionStep — tile catalog, product catalog, floor preview.
 * Extracted from TileSelectionStep.tsx (lines 1345-1394).
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TileCatalog } from "@/components/tiles/TileCatalog";
import { ProductCatalog } from "@/components/products/ProductCatalog";
import { FloorTilePreview } from "@/components/tiles/FloorTilePreview";
import { calculateAreaInSquareFeet } from "@/utils/unitConversions";
import type { Room } from "@/hooks/useRooms";
import type { Tile } from "@/hooks/useTiles";
import type { CatalogContext } from "./useTileSelectionState";

interface TileSelectionDialogsProps {
  // Tile catalog
  showTileCatalog: boolean;
  onShowTileCatalogChange: (open: boolean) => void;
  catalogContext: CatalogContext | null;
  onTileSelected: (tileId: string) => void;
  onAutoAssignTile: (tileId: string) => void;
  onCatalogClose: () => void;
  
  // Product catalog
  showProductCatalog: boolean;
  onShowProductCatalogChange: (open: boolean) => void;
  onProductSelected: (product: { id: string; name: string; price: number }) => void;
  
  // Floor preview
  showFloorPreview: { room: Room; tile: Tile | null } | null;
  onCloseFloorPreview: () => void;
}

export const TileSelectionDialogs = ({
  showTileCatalog,
  onShowTileCatalogChange,
  catalogContext,
  onTileSelected,
  onAutoAssignTile,
  onCatalogClose,
  showProductCatalog,
  onShowProductCatalogChange,
  onProductSelected,
  showFloorPreview,
  onCloseFloorPreview,
}: TileSelectionDialogsProps) => {
  return (
    <>
      <Dialog open={showTileCatalog} onOpenChange={onShowTileCatalogChange}>
        <DialogContent className="max-w-4xl h-[85vh] p-0">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>
              {catalogContext?.roomIds
                ? `Select Tile for ${catalogContext.roomIds.length} Rooms`
                : catalogContext
                  ? `Select Tile for Room`
                  : 'Select Tiles'
              }
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            <TileCatalog
              isSelectionMode={true}
              onTileSelect={onTileSelected}
              autoAssignmentContext={null}
              onAutoAssignment={onAutoAssignTile}
              onNavigateBack={onCatalogClose}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProductCatalog} onOpenChange={onShowProductCatalogChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0 w-full">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="sr-only">Select Product</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <ProductCatalog
              userRole="worker"
              onSelect={onProductSelected}
            />
          </div>
        </DialogContent>
      </Dialog>

      <FloorTilePreview
        isOpen={!!showFloorPreview}
        onClose={onCloseFloorPreview}
        tile={showFloorPreview?.tile || null}
        area={showFloorPreview ? calculateAreaInSquareFeet(showFloorPreview.room.length, showFloorPreview.room.width, showFloorPreview.room.unit) : 0}
        unit="ft"
      />
    </>
  );
};
