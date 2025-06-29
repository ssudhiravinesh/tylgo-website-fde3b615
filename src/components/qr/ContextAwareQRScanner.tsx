
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, X, Users, Home, Check, AlertCircle } from 'lucide-react';
import { useCameraAccess } from '@/hooks/useCameraAccess';
import { useQRScanning } from '@/hooks/useQRScanning';
import { CameraControls } from './CameraControls';
import { ScanningOverlay } from './ScanningOverlay';
import { CameraErrorCard } from './CameraErrorCard';
import { useQRScanningContext } from '@/contexts/QRScanningContext';
import { useTiles } from '@/hooks/useTiles';
import { useRoomsByCustomer } from '@/hooks/useRooms';
import { useSaveRoomTileSelections } from '@/hooks/useRooms';
import { toast } from 'sonner';

interface ContextAwareQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContextAwareQRScanner: React.FC<ContextAwareQRScannerProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [lastScannedTile, setLastScannedTile] = useState<string | null>(null);
  const [processingAssignment, setProcessingAssignment] = useState(false);
  
  const { 
    currentCustomerId, 
    currentCustomerName, 
    selectedRoomIds, 
    isContextActive 
  } = useQRScanningContext();
  
  const { data: tiles = [] } = useTiles();
  const { data: rooms = [] } = useRoomsByCustomer(currentCustomerId || '');
  const saveSelectionsMutation = useSaveRoomTileSelections();
  
  const {
    hasCamera,
    stream,
    cameraError,
    debugInfo,
    videoRef,
    startCamera,
    stopCamera,
    retryCamera
  } = useCameraAccess();

  const { canvasRef, startScanning, stopScanning } = useQRScanning(async (tileCode) => {
    if (!isContextActive) {
      toast.error("Please select a customer and rooms first");
      return;
    }

    const tile = tiles.find(t => t.code === tileCode);
    if (!tile) {
      toast.error(`No tile found with code: ${tileCode}`);
      return;
    }

    // Prevent duplicate scans
    if (lastScannedTile === tileCode) {
      toast.error("This tile was just scanned. Please scan a different tile.");
      return;
    }

    setLastScannedTile(tileCode);
    setProcessingAssignment(true);

    try {
      // Prepare selections for all selected rooms
      const selectionsToSave = selectedRoomIds.map(roomId => ({
        customer_id: currentCustomerId!,
        room_id: roomId,
        tile_id: tile.id
      }));

      await saveSelectionsMutation.mutateAsync(selectionsToSave);
      
      const roomNames = rooms
        .filter(room => selectedRoomIds.includes(room.id))
        .map(room => room.name)
        .join(', ');

      toast.success(
        `Tile "${tile.name}" assigned to ${selectedRoomIds.length} room(s): ${roomNames}`,
        { duration: 3000 }
      );

    } catch (error) {
      console.error('Error assigning tile:', error);
      toast.error("Failed to assign tile to rooms");
    } finally {
      setProcessingAssignment(false);
      // Clear the last scanned tile after 3 seconds to allow re-scanning
      setTimeout(() => setLastScannedTile(null), 3000);
    }
  });

  useEffect(() => {
    if (isOpen) {
      startCamera(() => {
        if (videoRef.current) {
          startScanning(videoRef.current);
          setIsScanning(true);
        }
      });
    } else {
      stopScanning();
      stopCamera();
      setIsScanning(false);
      setTorchEnabled(false);
      setLastScannedTile(null);
    }

    return () => {
      stopScanning();
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, startScanning, stopScanning]);

  const handleClose = () => {
    stopScanning();
    stopCamera();
    setIsScanning(false);
    setTorchEnabled(false);
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
            Context-Aware Tile Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context Status */}
          <div className="bg-blue-50 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-2">
              <Users className="h-4 w-4" />
              Current Context
            </div>
            
            {currentCustomerName && (
              <div className="flex items-center gap-2 text-sm text-blue-700 mb-1">
                <span>Customer: {currentCustomerName}</span>
              </div>
            )}
            
            {selectedRoomNames.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Home className="h-4 w-4" />
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

          {/* Scanner */}
          {isContextActive ? (
            hasCamera ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-80 object-cover rounded-lg bg-gray-900"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <ScanningOverlay isScanning={isScanning && !processingAssignment} />
                
                {processingAssignment && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="bg-white p-4 rounded-lg flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium">Assigning tile...</span>
                    </div>
                  </div>
                )}
                
                <CameraControls 
                  stream={stream}
                  torchEnabled={torchEnabled}
                  setTorchEnabled={setTorchEnabled}
                />
              </div>
            ) : (
              <CameraErrorCard 
                cameraError={cameraError}
                debugInfo={debugInfo}
                onRetryCamera={retryCamera}
              />
            )
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Context Required
              </h3>
              <p className="text-gray-600 text-sm">
                Go to Room Management, select a customer and rooms before scanning tiles.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {isContextActive 
              ? "Scan QR codes to automatically assign tiles to selected rooms"
              : "Set up customer context first, then scan tiles for instant assignment"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
