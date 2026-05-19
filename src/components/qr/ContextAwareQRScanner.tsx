
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, X, Users, Home, Check, AlertCircle, Type } from 'lucide-react';
import { useQRScanningContext } from '@/contexts/QRScanningContext';
import { useTiles } from '@/hooks/useTiles';
import { useProducts } from '@/hooks/useProducts';
import { useRoomsByCustomer } from '@/hooks/useRooms';
import { useSaveRoomTileSelections } from '@/hooks/useRooms';
import { useSaveRoomProductSelection } from '@/hooks/useProductSelections';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ContextAwareQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContextAwareQRScanner: React.FC<ContextAwareQRScannerProps> = ({
  isOpen,
  onClose
}) => {
  const [lastScannedTile, setLastScannedTile] = useState<string | null>(null);
  const [processingAssignment, setProcessingAssignment] = useState(false);

  const {
    currentCustomerId,
    currentCustomerName,
    selectedRoomIds,
    isContextActive
  } = useQRScanningContext();

  const { data: tiles = [] } = useTiles();
  const { data: products = [] } = useProducts();
  const { data: rooms = [] } = useRoomsByCustomer(currentCustomerId || '');
  const saveTileSelectionsMutation = useSaveRoomTileSelections();
  const saveProductSelectionMutation = useSaveRoomProductSelection();
  const queryClient = useQueryClient();

  const handleManualInput = () => {
    const input = prompt('Enter the tile or product code:');
    if (input && input.trim()) {
      handleScan(input.trim());
    }
  };

  const handleScan = async (code: string) => {
    if (!isContextActive) {
      toast.error("Please select a customer and rooms first");
      return;
    }

    // Prevent duplicate scans
    if (lastScannedTile === code) {
      toast.error("This item was just scanned. Please scan a different item.");
      return;
    }

    setLastScannedTile(code);
    setProcessingAssignment(true);

    try {
      // Check if it's a tile
      const tile = tiles.find(t => t.code === code);

      if (tile) {
        // Handle Tile Assignment
        const selectionsToSave = selectedRoomIds.map(roomId => ({
          customer_id: currentCustomerId!,
          room_id: roomId,
          tile_id: tile.id
        }));

        await saveTileSelectionsMutation.mutateAsync(selectionsToSave);

        const roomNames = rooms
          .filter(room => selectedRoomIds.includes(room.id))
          .map(room => room.name)
          .join(', ');

        toast.success(
          `Tile "${tile.code}" assigned to ${selectedRoomIds.length} room(s): ${roomNames}`,
          { duration: 3000 }
        );
        return;
      }

      // Check if it's a product
      const product = products.find(p => p.code === code);

      if (product) {
        // Handle Product Assignment
        const promises = selectedRoomIds.map(roomId =>
          saveProductSelectionMutation.mutateAsync({
            customer_id: currentCustomerId!,
            room_id: roomId,
            product_id: product.id,
            quantity: 1 // Default quantity
          })
        );

        await Promise.all(promises);

        const roomNames = rooms
          .filter(room => selectedRoomIds.includes(room.id))
          .map(room => room.name)
          .join(', ');

        toast.success(
          `Product "${product.code}" assigned to ${selectedRoomIds.length} room(s): ${roomNames}`,
          { duration: 3000 }
        );
        return;
      }

      toast.error(`No tile or product found with code: ${code}`);

    } catch (error) {
      console.error('Error assigning item:', error);
      toast.error("Failed to assign item to rooms");
    } finally {
      setProcessingAssignment(false);
      // Clear the last scanned tile after 3 seconds to allow re-scanning
      setTimeout(() => setLastScannedTile(null), 3000);
    }
  };

  const handleClose = () => {
    setLastScannedTile(null);
    onClose();
  };

  const selectedRoomNames = rooms
    .filter(room => selectedRoomIds.includes(room.id))
    .map(room => room.name);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Context-Aware Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context Status */}
          <div className="bg-primary/10 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-2">
              <Users className="h-4 w-4" />
              Current Context
            </div>

            {currentCustomerName && (
              <div className="flex items-center gap-2 text-sm text-primary/80 mb-1">
                <span>Customer: {currentCustomerName}</span>
              </div>
            )}

            {selectedRoomNames.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-primary/80">
                <span>Rooms: {selectedRoomNames.join(', ')}</span>
              </div>
            )}

            {!isContextActive && (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4" />
                <span>Please select customer and rooms first</span>
              </div>
            )}
          </div>

          {/* Manual Input */}
          {isContextActive ? (
            <div className="text-center py-8">
              <Type className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground/80 mb-2">
                Manual Item Input
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Enter the tile or product code manually to assign to selected rooms.
              </p>
              <Button onClick={handleManualInput} disabled={processingAssignment}>
                <Type className="h-4 w-4 mr-2" />
                Enter Code
              </Button>

              {processingAssignment && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Assigning tile...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground/80 mb-2">
                Context Required
              </h3>
              <p className="text-muted-foreground text-sm">
                Go to Room Management, select a customer and rooms before entering tile codes.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isContextActive
              ? "Enter codes to automatically assign tiles or products to selected rooms"
              : "Set up customer context first, then enter codes for instant assignment"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
