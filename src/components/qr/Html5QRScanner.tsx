import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Flashlight, FlashlightOff } from 'lucide-react';
import { toast } from 'sonner';

interface Html5QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (tileCode: string) => void;
}

export const Html5QRScanner: React.FC<Html5QRScannerProps> = ({ 
  isOpen, 
  onClose, 
  onScan 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [hasScanned, setHasScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'qr-reader';
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHasScanned(false);
      setIsProcessing(false);
      initializeScanner();
    } else {
      cleanup();
      setHasScanned(false);
      setIsProcessing(false);
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      if (devices && devices.length > 0) {
        // Prefer back camera (environment facing)
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        );
        const cameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCamera(cameraId);
        
        startScanning(cameraId);
      } else {
        toast.error('No cameras found');
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
      toast.error('Unable to access cameras. Please check permissions.');
    }
  };

  const startScanning = async (cameraId: string) => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      await scannerRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          console.log('QR Code detected:', decodedText);
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore frequent scan errors, they're normal
          // console.log('Scan error:', errorMessage);
        }
      );

      setIsScanning(true);
      toast.success('Scanner started! Point your camera at a QR code.');
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error('Failed to start camera. Please check permissions.');
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    // Prevent multiple scans with multiple checks
    if (hasScanned || isProcessing || !decodedText || !decodedText.trim()) {
      console.log('Scan prevented - already processed or invalid data');
      return;
    }
    
    console.log('Processing QR scan:', decodedText);
    
    // Set both flags immediately to prevent any other calls
    setHasScanned(true);
    setIsProcessing(true);
    
    // Clear any existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    try {
      // Mobile-specific: Stop all video tracks first
      const videoElement = document.getElementById(elementId)?.querySelector('video');
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped video track:', track.kind);
        });
      }
      
      // Stop scanner immediately and aggressively
      if (scannerRef.current) {
        try {
          if (isScanning) {
            await scannerRef.current.stop();
          }
          // Clear the scanner element completely
          scannerRef.current.clear();
        } catch (stopError) {
          console.log('Error stopping scanner, but continuing...', stopError);
        }
        // Nullify the scanner reference to prevent any further operations
        scannerRef.current = null;
      }
      setIsScanning(false);
      
      toast.success('QR Code scanned successfully!');
      
      // Process the scan result immediately
      onScan(decodedText.trim());
      
      // Close immediately without delay for mobile compatibility
      handleClose();
      
    } catch (error) {
      console.error('Error stopping scanner after scan:', error);
      // Still proceed with the scan result even if stopping fails
      onScan(decodedText.trim());
      handleClose();
    }
  };

  const cleanup = async () => {
    try {
      // Clear any pending timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
    } finally {
      setIsScanning(false);
      setTorchEnabled(false);
      setIsProcessing(false);
      scannerRef.current = null;
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const toggleTorch = async () => {
    // Don't allow torch toggle if processing a scan
    if (isProcessing || hasScanned) {
      return;
    }
    
    try {
      if (scannerRef.current && isScanning) {
        const capabilities = await scannerRef.current.getRunningTrackCapabilities();
        if ((capabilities as any).torch) {
          const constraints = {
            advanced: [{
              torch: !torchEnabled
            } as any]
          };
          await scannerRef.current.applyVideoConstraints(constraints);
          setTorchEnabled(!torchEnabled);
        } else {
          toast.error('Flashlight not supported on this device');
        }
      }
    } catch (error) {
      console.error('Error toggling torch:', error);
      toast.error('Failed to toggle flashlight');
    }
  };

  const switchCamera = async () => {
    // Don't allow camera switch if processing a scan
    if (isProcessing || hasScanned) {
      return;
    }
    
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(cam => cam.id === selectedCamera);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      
      try {
        await cleanup();
        setSelectedCamera(nextCamera.id);
        await startScanning(nextCamera.id);
        toast.success(`Switched to ${nextCamera.label}`);
      } catch (error) {
        console.error('Error switching camera:', error);
        toast.error('Failed to switch camera');
      }
    }
  };

  const handleManualInput = () => {
    const input = prompt('Enter the tile code manually:');
    if (input && input.trim()) {
      onScan(input.trim());
      handleClose();
    }
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
          {/* Scanner Container */}
          <div className="relative">
            <div 
              id={elementId}
              className="w-full rounded-lg overflow-hidden bg-gray-900"
              style={{ minHeight: '300px' }}
            />
            
            {/* Controls Overlay */}
            {isScanning && !isProcessing && (
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTorch}
                  className="bg-white/80 hover:bg-white"
                  disabled={isProcessing}
                >
                  {torchEnabled ? (
                    <FlashlightOff className="h-4 w-4" />
                  ) : (
                    <Flashlight className="h-4 w-4" />
                  )}
                </Button>
                
                {cameras.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={switchCamera}
                    className="bg-white/80 hover:bg-white"
                    disabled={isProcessing}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            
            {/* Status Overlay */}
            {(!isScanning || isProcessing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                <div className="text-center text-white">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    {isProcessing ? 'Processing scan...' : 'Initializing camera...'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleManualInput} 
              className="flex-1"
              disabled={isProcessing}
            >
              Manual Input
            </Button>
          </div>
          
          {/* Instructions */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {isProcessing ? 'Processing your scan...' : 'Point your camera at a QR code to scan automatically'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isProcessing ? 'Please wait...' : 'Make sure there\'s good lighting and hold steady'}
            </p>
          </div>
          
          {/* Camera Info */}
          {isScanning && selectedCamera && !isProcessing && (
            <div className="text-xs text-gray-400 text-center">
              Using: {cameras.find(cam => cam.id === selectedCamera)?.label || 'Camera'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};