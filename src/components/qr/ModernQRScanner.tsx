// src/components/qr/ModernQRScanner.tsx
import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Flashlight, FlashlightOff } from 'lucide-react';
import { toast } from 'sonner';

interface ModernQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (tileCode: string) => void;
}

export const ModernQRScanner: React.FC<ModernQRScannerProps> = ({ 
  isOpen, 
  onClose, 
  onScan 
}) => {
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);

  const handleScan = (result: any) => {
    if (!result?.[0]?.rawValue) return;
    
    const currentTime = Date.now();
    const scannedData = result[0].rawValue.trim();
    
    // Prevent duplicate scans within 2 seconds
    if (currentTime - lastScanTime < 2000) {
      return;
    }
    
    setLastScanTime(currentTime);
    console.log('QR Code detected:', scannedData);
    
    // Show success toast
    toast.success('QR Code scanned successfully!');
    
    // Call the callback with the scanned data
    onScan(scannedData);
    
    // Close the scanner
    onClose();
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    
    if (error?.name === 'NotAllowedError') {
      toast.error('Camera access denied. Please allow camera access and try again.');
    } else if (error?.name === 'NotFoundError') {
      toast.error('No camera found. Please check your device has a camera.');
    } else {
      toast.error('QR Scanner error. Please try again.');
    }
  };

  const toggleTorch = () => {
    setTorchEnabled(!torchEnabled);
  };

  const handleManualInput = () => {
    const input = prompt('Enter the tile code manually:');
    if (input && input.trim()) {
      onScan(input.trim());
      onClose();
    }
  };

  const handleClose = () => {
    setIsScanning(false);
    setTorchEnabled(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Tile QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <div className="w-full h-80 bg-gray-900 rounded-lg overflow-hidden">
              {isOpen && (
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{
                    video: {
                      facingMode: 'environment', // Use back camera
                      width: { ideal: 1280 },
                      height: { ideal: 720 }
                    }
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      height: '100%',
                    },
                    video: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }
                  }}
                  components={{
                    audio: false,
                    finder: true,
                    torch: torchEnabled
                  }}
                />
              )}
            </div>
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white border-dashed rounded-lg w-48 h-48 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-pulse">
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Position QR code here</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Torch button */}
            <div className="absolute top-4 right-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTorch}
                className="bg-white/80 hover:bg-white"
              >
                {torchEnabled ? (
                  <FlashlightOff className="h-4 w-4" />
                ) : (
                  <Flashlight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleManualInput} className="flex-1">
              Manual Input
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Point your camera at a QR code to scan automatically
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Make sure there's good lighting and hold steady
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
