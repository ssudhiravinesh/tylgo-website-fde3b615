/**
 * TileSelectionStep — Orchestrator component for tile/product selection workflow.
 * 
 * A thin orchestrator that delegates:
 * - State management → useTileSelectionState hook
 * - Room rendering → UnifiedRoomCard (handles both floor and wall surfaces)
 * - Summary sidebar → TileSelectionSummary
 * - Dialog modals → TileSelectionDialogs
 * - Staircase section → StaircasesSection (already extracted)
 * - Global products → GlobalProductsSection (already extracted)
 */

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSaveRoomTileSelections, useDeleteRoomTileSelection } from "@/hooks/useRooms";
import { useSaveStaircaseTileSelection, useDeleteStaircaseTileSelection } from "@/hooks/useStaircases";
import { useSaveRoomProductSelection, useDeleteRoomProductSelection } from "@/hooks/useProductSelections";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { WallTileSelectionPage } from "./WallTileSelectionPage";
import { GlobalProductsSection } from "./TileSelection/GlobalProductsSection";
import { StaircasesSection } from "./TileSelection/StaircasesSection";

import { UnifiedRoomCard } from "./TileSelection/UnifiedRoomCard";
import { TileSelectionSummary } from "./TileSelection/TileSelectionSummary";
import { TileSelectionDialogs } from "./TileSelection/TileSelectionDialogs";
import { useTileSelectionState } from "./TileSelection/useTileSelectionState";

import {
  calculateTileRequirements,
  calculateGrandTotal,
  prepareQuotationItems,
  type FloorTileSelection,
  type WallTileLayer,
  calculateStaircaseTileRequirements,
  prepareStaircaseQuotationItems
} from "@/utils/tileCalculations";
import type { Room } from "@/hooks/useRooms";
import type { Staircase } from "@/hooks/useStaircases";

interface TileSelectionStepProps {
  customerId: string;
  rooms: Room[];
  staircases?: Staircase[];
  onBack: () => void;
}

export const TileSelectionStep = ({ customerId, rooms, staircases = [], onBack }: TileSelectionStepProps) => {
  // ── State (hook) ──────────────────────────────────────────────────
  const state = useTileSelectionState(customerId, rooms, staircases);

  // ── Mutations ─────────────────────────────────────────────────────
  const saveSelectionsMutation = useSaveRoomTileSelections();
  const deleteSelectionMutation = useDeleteRoomTileSelection();
  const saveStaircaseSelectionMutation = useSaveStaircaseTileSelection();
  const saveProductSelectionMutation = useSaveRoomProductSelection();
  const deleteProductSelectionMutation = useDeleteRoomProductSelection();

  // ── Handlers: Floor Tiles ─────────────────────────────────────────

  const toggleFloorRoomSelection = (roomId: string) => {
    const newSet = new Set(state.selectedFloorRooms);
    if (newSet.has(roomId)) {
      newSet.delete(roomId);
    } else {
      newSet.add(roomId);
    }
    state.setSelectedFloorRooms(newSet);
  };

  const handleBulkAddTile = () => {
    if (state.selectedFloorRooms.size === 0) {
      toast.error("Please select at least one room");
      return;
    }
    state.setCatalogContext({
      roomIds: Array.from(state.selectedFloorRooms),
      isWallTile: false
    });
    state.setShowTileCatalog(true);
  };

  const handleAddFloorTile = (roomId: string) => {
    state.setCatalogContext({ roomId, isWallTile: false });
    state.setShowTileCatalog(true);
  };

  const handleRemoveFloorTile = async (roomId: string, tileId: string) => {
    try {
      await deleteSelectionMutation.mutateAsync({ roomId, tileId });
      state.setFloorTileSelections(prev =>
        prev.filter(fs => !(fs.roomId === roomId && fs.tileId === tileId))
      );
      toast.success("Floor tile removed");
    } catch {
      toast.error("Failed to remove tile");
    }
  };

  // ── Handlers: Auto-assign (bulk tile save) ────────────────────────

  const handleAutoAssignTile = async (tileId: string) => {
    if (!state.catalogContext) {
      toast.error('Room context not found');
      return;
    }

    const { roomId, roomIds, isWallTile } = state.catalogContext;
    const targetRoomIds = roomIds && roomIds.length > 0 ? roomIds : (roomId ? [roomId] : []);

    if (targetRoomIds.length === 0) {
      toast.error("No rooms targeted for assignment");
      return;
    }

    if (!isWallTile) {
      const roomsToAdd = targetRoomIds.filter(
        id => !state.floorTileSelections.find(fs => fs.roomId === id && fs.tileId === tileId)
      );

      if (roomsToAdd.length === 0) {
        toast.info("Tile already selected for all target rooms");
        return;
      }

      try {
        const newSelections = roomsToAdd.map(id => ({ roomId: id, tileId }));
        state.setFloorTileSelections(prev => [...prev, ...newSelections]);

        const selectionsToSave: { customer_id: string; room_id: string; tile_id: string; layer_number?: number }[] = [];

        [...state.floorTileSelections, ...newSelections].forEach(fs => {
          selectionsToSave.push({ customer_id: customerId, room_id: fs.roomId, tile_id: fs.tileId });
        });

        state.wallTileSelections.forEach(ws => {
          ws.layers.forEach(layer => {
            selectionsToSave.push({ customer_id: customerId, room_id: ws.roomId, tile_id: layer.tileId, layer_number: layer.layerNumber });
          });
        });

        await saveSelectionsMutation.mutateAsync(selectionsToSave);

        const tileName = state.tiles.find(t => t.id === tileId)?.code || 'Tile';
        if (roomsToAdd.length === 1) {
          const roomName = rooms.find(r => r.id === roomsToAdd[0])?.name || 'Room';
          toast.success(`${tileName} assigned to ${roomName} successfully!`);
        } else {
          toast.success(`${tileName} assigned to ${roomsToAdd.length} rooms successfully!`);
        }

        if (roomIds && roomIds.length > 0) {
          state.setSelectedFloorRooms(new Set());
        }
      } catch {
        state.setFloorTileSelections(prev =>
          prev.filter(fs => !(roomsToAdd.includes(fs.roomId) && fs.tileId === tileId))
        );
        toast.error("Failed to save tile assignment");
        return;
      }
    }

    state.setShowTileCatalog(false);
    state.setCatalogContext(null);
  };

  // ── Handlers: Wall Tiles ──────────────────────────────────────────

  const handleConfigureWallTiles = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId && r.has_wall);
    if (!room) return;

    let wallSelection = state.wallTileSelections.find(ws => ws.roomId === roomId);
    if (!wallSelection) {
      wallSelection = { roomId, baseTileId: null, layers: [], totalLayers: 0 };
      state.setWallTileSelections(prev => [...prev, wallSelection!]);
    }
    state.setShowWallTileSelection({ roomId, room });
  };

  const handleClearWallTiles = (roomId: string) => {
    state.setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId
          ? { ...ws, baseTileId: null, layers: [], totalLayers: 0 }
          : ws
      )
    );
  };

  const calculateWallLayers = (roomId: string, baseTileId: string) => {
    const room = rooms.find(r => r.id === roomId && r.has_wall);
    const baseTile = state.tiles.find(t => t.id === baseTileId);
    if (!room || !baseTile) return;

    const wallHeight = room.wall_height || 0;
    const wallLength = room.wall_length || room.length || 0;
    let tileHeightInRoomUnit: number;
    let tileLengthInRoomUnit: number;

    if (room.unit === "feet") {
      tileHeightInRoomUnit = (baseTile.size_length || 0) / 304.8;
      tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 304.8;
    } else if (room.unit === "metre") {
      tileHeightInRoomUnit = (baseTile.size_length || 0) / 1000;
      tileLengthInRoomUnit = (baseTile.size_breadth || 0) / 1000;
    } else {
      tileHeightInRoomUnit = baseTile.size_length || 0;
      tileLengthInRoomUnit = baseTile.size_breadth || 0;
    }

    const totalArea = wallHeight * wallLength;
    const tileArea = tileHeightInRoomUnit * tileLengthInRoomUnit;
    if (tileArea <= 0) return;

    const grandTotalTilesNeeded = Math.ceil(totalArea / tileArea);
    const layerCount = Math.max(1, Math.ceil(wallHeight / tileHeightInRoomUnit));
    const tilesPerLayer = grandTotalTilesNeeded / layerCount;

    const layers: WallTileLayer[] = [];
    for (let i = 1; i <= layerCount; i++) {
      layers.push({ layerNumber: i, tileId: baseTileId, tilesNeeded: tilesPerLayer });
    }

    state.setWallTileSelections(prev =>
      prev.map(ws =>
        ws.roomId === roomId ? { ...ws, baseTileId, layers, totalLayers: layerCount } : ws
      )
    );
  };

  // ── Handlers: Tile Selected (routing) ─────────────────────────────

  const handleTileSelected = (tileId: string) => {
    if (!state.catalogContext) return;
    const { roomId, roomIds, isWallTile, layerNumber } = state.catalogContext;

    if (!isWallTile) {
      if (roomIds && roomIds.length > 0) {
        const newSelections: FloorTileSelection[] = [];
        let addedCount = 0;
        roomIds.forEach(id => {
          if (!state.floorTileSelections.find(fs => fs.roomId === id && fs.tileId === tileId)) {
            newSelections.push({ roomId: id, tileId });
            addedCount++;
          }
        });
        if (addedCount > 0) {
          state.setFloorTileSelections(prev => [...prev, ...newSelections]);
          toast.success(`Tile added to ${addedCount} room${addedCount > 1 ? 's' : ''}`);
          state.setSelectedFloorRooms(new Set());
        } else {
          toast.info("Selected tile is already present in all selected rooms");
        }
      } else if (roomId) {
        if (state.floorTileSelections.find(fs => fs.roomId === roomId && fs.tileId === tileId)) {
          toast.error("This tile is already selected for this room");
        } else {
          state.setFloorTileSelections(prev => [...prev, { roomId, tileId }]);
          toast.success("Floor tile added to room");
        }
      }
    } else if (roomId) {
      const wallSelection = state.wallTileSelections.find(ws => ws.roomId === roomId);
      if (!wallSelection || !wallSelection.baseTileId) {
        calculateWallLayers(roomId, tileId);
        toast.success("Base wall tile selected and layers calculated");
      } else if (layerNumber !== undefined) {
        state.setWallTileSelections(prev =>
          prev.map(ws =>
            ws.roomId === roomId
              ? { ...ws, layers: ws.layers.map(layer => layer.layerNumber === layerNumber ? { ...layer, tileId } : layer) }
              : ws
          )
        );
        toast.success(`Tile updated for layer ${layerNumber}`);
      }
    }

    if (state.catalogContext?.staircaseId && state.catalogContext?.staircaseTileType) {
      handleStaircaseTileSelected(tileId);
      return;
    }

    state.setShowTileCatalog(false);
    state.setCatalogContext(null);
  };

  // ── Handlers: Staircases ──────────────────────────────────────────

  const handleSelectStaircaseTile = (staircaseId: string, tileType: 'step' | 'riser') => {
    state.setCatalogContext({ staircaseId, staircaseTileType: tileType, isWallTile: false });
    state.setShowTileCatalog(true);
  };

  const handleStaircaseTileSelected = async (tileId: string) => {
    if (!state.catalogContext?.staircaseId || !state.catalogContext?.staircaseTileType) return;
    const { staircaseId, staircaseTileType } = state.catalogContext;

    state.setStaircaseTileSelectionsState(prev => {
      const existing = prev.find(s => s.staircaseId === staircaseId);
      if (existing) {
        return prev.map(s =>
          s.staircaseId === staircaseId
            ? { ...s, [staircaseTileType === 'step' ? 'stepTileId' : 'riserTileId']: tileId }
            : s
        );
      }
      return [...prev, {
        staircaseId,
        stepTileId: staircaseTileType === 'step' ? tileId : undefined,
        riserTileId: staircaseTileType === 'riser' ? tileId : undefined
      }];
    });

    try {
      await saveStaircaseSelectionMutation.mutateAsync({
        staircase_id: staircaseId,
        customer_id: customerId,
        tile_id: tileId,
        tile_type: staircaseTileType
      });
      toast.success(`${staircaseTileType === 'step' ? 'Step' : 'Riser'} tile assigned successfully!`);
    } catch {
      toast.error('Failed to save tile selection');
    }

    state.setShowTileCatalog(false);
    state.setCatalogContext(null);
  };

  // ── Handlers: Products ────────────────────────────────────────────

  const handleAddProduct = (roomId: string) => {
    state.setCatalogContext({ roomId, isWallTile: false });
    state.setShowProductCatalog(true);
  };

  const handleProductSelected = async (product: { id: string; name: string; price: number }) => {
    if (!state.catalogContext?.roomId) return;
    try {
      await saveProductSelectionMutation.mutateAsync({
        room_id: state.catalogContext.roomId,
        product_id: product.id,
        customer_id: customerId,
        quantity: 1
      });
    } catch (error) {
      console.error(error);
    }
    state.setShowProductCatalog(false);
    state.setCatalogContext(null);
  };

  const handleRemoveProduct = async (selectionId: string) => {
    if (confirm("Remove this product?")) {
      await deleteProductSelectionMutation.mutateAsync({ id: selectionId, customerId });
    }
  };

  // ── Handlers: Save & Generate ─────────────────────────────────────

  const handleSaveSelections = async () => {
    const selectionsToSave: { customer_id: string; room_id: string; tile_id: string; layer_number?: number }[] = [];

    state.floorTileSelections.forEach(fs => {
      selectionsToSave.push({ customer_id: customerId, room_id: fs.roomId, tile_id: fs.tileId });
    });

    state.wallTileSelections.forEach(ws => {
      ws.layers.forEach(layer => {
        selectionsToSave.push({ customer_id: customerId, room_id: ws.roomId, tile_id: layer.tileId, layer_number: layer.layerNumber });
      });
    });

    try {
      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      toast.success("Tile selections saved successfully!");
    } catch {
      toast.error("Failed to save selections. Please try again.");
    }
  };

  const handleGenerateQuotation = () => {
    const hasFloorTiles = state.floorTileSelections.length > 0;
    const hasWallTiles = state.wallTileSelections.some(ws => ws.layers.length > 0);
    const hasStaircaseTiles = state.staircaseTileSelectionsState.some(s => s.stepTileId || s.riserTileId);
    const hasProducts = state.customerProducts.length > 0 || state.productSelections.length > 0;

    if (!hasFloorTiles && !hasWallTiles && !hasStaircaseTiles && !hasProducts) {
      toast.error("Please select tiles for at least one room, staircase or add products before generating quotation");
      return;
    }
    state.setShowQuotationForm(true);
  };

  // ── Calculations ──────────────────────────────────────────────────

  const calculations = calculateTileRequirements(
    state.floorTileSelections,
    state.wallTileSelections,
    rooms,
    state.tiles,
    state.getWastagePercentage()
  );

  const staircaseCalculations = calculateStaircaseTileRequirements(
    state.staircaseTileSelectionsState,
    staircases,
    state.tiles,
    state.getWastagePercentage()
  );

  const grandTotal = calculateGrandTotal(calculations) +
    staircaseCalculations.reduce((sum, calc) => sum + calc.totalPrice, 0) +
    state.productSelections.reduce((sum, cp) => sum + ((cp.product?.price || 0) * (cp.quantity || 1)), 0) +
    state.customerProducts.reduce((sum, cp) => sum + ((cp.product?.price || 0) * (cp.quantity || 1)), 0);

  const prepareQuotationData = () => {
    const roomItems = prepareQuotationItems(
      state.floorTileSelections,
      state.wallTileSelections,
      rooms,
      state.tiles,
      state.getWastagePercentage()
    );

    const staircaseItems = prepareStaircaseQuotationItems(
      state.staircaseTileSelectionsState,
      staircases,
      state.tiles,
      state.getWastagePercentage()
    );

    const productItemsFromRooms = state.productSelections.map(cp => ({
      product_id: cp.product_id,
      quantity: cp.quantity || 1,
      total_price: (cp.product?.price || 0) * (cp.quantity || 1),
      price_per_box: cp.product?.price || 0,
      cost_price: cp.product?.price || 0,
      display_name: cp.product?.name
    }));

    const globalProductItems = state.customerProducts.map(cp => ({
      product_id: cp.product_id,
      quantity: cp.quantity || 1,
      total_price: (cp.product?.price || 0) * (cp.quantity || 1),
      price_per_box: cp.product?.price || 0,
      cost_price: cp.product?.price || 0,
      display_name: cp.product?.name
    }));

    return [...roomItems, ...staircaseItems, ...productItemsFromRooms, ...globalProductItems];
  };

  // ── Loading ───────────────────────────────────────────────────────

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-base font-medium mb-4">Loading...</p>
          <div className="w-48 h-1 bg-gray-200 rounded overflow-hidden mx-auto">
            <div className="h-full w-full bg-gradient-to-r from-blue-500 via-blue-300 to-blue-500 bg-[length:200%_100%] animate-[progressFlow_2s_linear_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Sub-page: Wall tile configuration ─────────────────────────────

  if (state.showWallTileSelection) {
    const wallSelection = state.wallTileSelections.find(ws => ws.roomId === state.showWallTileSelection!.roomId) || {
      roomId: state.showWallTileSelection.roomId,
      baseTileId: null,
      layers: [],
      totalLayers: 0
    };

    return (
      <WallTileSelectionPage
        room={state.showWallTileSelection.room}
        wallSelection={wallSelection}
        tiles={state.tiles}
        onBack={() => state.setShowWallTileSelection(null)}
        onUpdateSelection={(selection) => {
          state.setWallTileSelections(prev =>
            prev.map(ws => ws.roomId === selection.roomId ? selection : ws)
              .concat(prev.find(ws => ws.roomId === selection.roomId) ? [] : [selection])
          );
        }}
      />
    );
  }

  // ── Sub-page: Quotation form ──────────────────────────────────────

  if (state.showQuotationForm) {
    return (
      <QuotationForm
        preSelectedCustomerId={customerId}
        selectedRoomsData={prepareQuotationData()}
        wastagePercentage={state.getWastagePercentage()}
        onBack={() => state.setShowQuotationForm(false)}
        onSuccess={() => {
          state.setShowQuotationForm(false);
          toast.success("Quotation generated successfully!");
          onBack();
        }}
      />
    );
  }

  // ── Main render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">Select Tiles for Rooms</h2>
          <p className="text-gray-600">Configure floor and wall tiles with advanced layering options</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Room sections */}
        <div className="space-y-6 lg:col-span-2">
          <UnifiedRoomCard
            rooms={rooms}
            floorTileSelections={state.floorTileSelections}
            wallTileSelections={state.wallTileSelections}
            tiles={state.tiles}
            selectedFloorRooms={state.selectedFloorRooms}
            productSelections={state.productSelections}
            onToggleRoomSelection={toggleFloorRoomSelection}
            onAddFloorTile={handleAddFloorTile}
            onRemoveFloorTile={handleRemoveFloorTile}
            onConfigureWallTiles={handleConfigureWallTiles}
            onClearWallTiles={handleClearWallTiles}
            onAddProduct={handleAddProduct}
            onRemoveProduct={handleRemoveProduct}
            onShowPreview={(room, floorTile, wallLayers) => state.setShowRoomPreview({ room, floorTile, wallLayers })}
          />

          <StaircasesSection
            staircases={staircases}
            staircaseTileSelectionsState={state.staircaseTileSelectionsState}
            tiles={state.tiles}
            handleSelectStaircaseTile={handleSelectStaircaseTile}
          />
        </div>

        {/* Right: Summary sidebar */}
        <TileSelectionSummary
          rooms={rooms}
          selectedFloorRooms={state.selectedFloorRooms}
          onBulkAddTile={handleBulkAddTile}
          wastagePercentage={state.wastagePercentage}
          onWastageChange={state.setWastagePercentage}
          getWastagePercentage={state.getWastagePercentage}
          calculations={calculations}
          staircaseCalculations={staircaseCalculations}
          grandTotal={grandTotal}
          productSelections={state.productSelections}
          customerProducts={state.customerProducts}
          rooms={rooms}
          hasFloorSelections={state.floorTileSelections.length > 0}
          hasWallSelections={state.wallTileSelections.length > 0}
          onSaveSelections={handleSaveSelections}
          onGenerateQuotation={handleGenerateQuotation}
        />
      </div>

      <GlobalProductsSection customerProducts={state.customerProducts} />

      <TileSelectionDialogs
        showTileCatalog={state.showTileCatalog}
        onShowTileCatalogChange={state.setShowTileCatalog}
        catalogContext={state.catalogContext}
        onTileSelected={handleTileSelected}
        onAutoAssignTile={handleAutoAssignTile}
        onCatalogClose={() => { state.setShowTileCatalog(false); state.setCatalogContext(null); }}
        showProductCatalog={state.showProductCatalog}
        onShowProductCatalogChange={state.setShowProductCatalog}
        onProductSelected={handleProductSelected}
        showRoomPreview={state.showRoomPreview}
        onCloseRoomPreview={() => state.setShowRoomPreview(null)}
      />
    </div>
  );
};
