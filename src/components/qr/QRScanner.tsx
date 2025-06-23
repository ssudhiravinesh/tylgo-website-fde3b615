
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { useCameraAccess } from '@/hooks/useCameraAccess';
import { useQRScanning } from '@/hooks/useQRScanning';
import { CameraControls } from './CameraControls';
import { ScanningOverlay } from './ScanningOverlay';
import { CameraErrorCard } from './CameraErrorCard';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (tileCode: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  
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

  const { canvasRef, startScanning, stopScanning } = useQRScanning((data) => {
    onScan(data);
    setIsScanning(false);
    onClose();
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
    }

    return () => {
      stopScanning();
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, startScanning, stopScanning]);

  const handleManualInput = () => {
    const input = prompt('Enter the tile code:');
    if (input && input.trim()) {
      onScan(input.trim());
      onClose();
    }
  };

  const handleClose = () => {
    stopScanning();
    stopCamera();
    setIsScanning(false);
    setTorchEnabled(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Tile QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasCamera ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded-lg bg-gray-900"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <ScanningOverlay isScanning={isScanning} />
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
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleManualInput} className="flex-1">
              Manual Input
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {hasCamera 
              ? "Position the QR code within the frame to scan automatically"
              : "Use manual input to enter the tile code, or fix camera access and try again"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
