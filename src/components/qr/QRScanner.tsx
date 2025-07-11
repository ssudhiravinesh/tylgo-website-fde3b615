import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Type } from 'lucide-react';
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
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'processing'>('idle');
  
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
    console.log('QR Code scanned:', data);
    setScanStatus('processing');
    setIsScanning(false);
    
    // Call the parent callback
    onScan(data);
    
    // Close the scanner
    setTimeout(() => {
      onClose();
    }, 100);
  });

  useEffect(() => {
    if (isOpen) {
      setScanStatus('idle');
      setIsScanning(false);
      
      startCamera(() => {
        if (videoRef.current) {
          console.log('Camera ready, starting QR scanning...');
          startScanning(videoRef.current);
          setIsScanning(true);
          setScanStatus('scanning');
        }
      });
    } else {
      // Cleanup when closing
      stopScanning();
      stopCamera();
      setIsScanning(false);
      setTorchEnabled(false);
      setScanStatus('idle');
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
    setScanStatus('idle');
    onClose();
  };

  // Debug function to test QR scanning
  const handleTestScan = () => {
    const testCode = 'TEST-TILE-001';
    console.log('Testing with code:', testCode);
    onScan(testCode);
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
          {/* Status indicator */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              scanStatus === 'idle' ? 'bg-gray-100 text-gray-600' :
              scanStatus === 'scanning' ? 'bg-blue-100 text-blue-600' :
              'bg-green-100 text-green-600'
            }`}>
              {scanStatus === 'idle' && 'Initializing...'}
              {scanStatus === 'scanning' && (
                <>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  Scanning for QR codes...
                </>
              )}
              {scanStatus === 'processing' && (
                <>
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Processing scan...
                </>
              )}
            </div>
          </div>

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
              
              <ScanningOverlay isScanning={isScanning && scanStatus === 'scanning'} />
              
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
              <Type className="h-4 w-4 mr-2" />
              Manual Input
            </Button>
          </div>

          {/* Debug button - remove in production */}
          <Button onClick={handleTestScan} variant="outline" className="w-full text-xs">
            Test Scan (Debug)
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            {hasCamera 
              ? "Position the QR code within the scanning frame"
              : "Use manual input to enter the tile code, or fix camera access and try again"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
