
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Flashlight, FlashlightOff, SwitchCamera } from 'lucide-react';
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
  const [currentCameraType, setCurrentCameraType] = useState<'front' | 'back'>('back');
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
      // Request camera permissions first
      await navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        });

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      if (devices && devices.length > 0) {
        // Start with back camera by default
        const backCamera = findCameraByType(devices, 'back');
        const cameraToUse = backCamera || devices[0];
        
        setSelectedCamera(cameraToUse.id);
        setCurrentCameraType(backCamera ? 'back' : 'front');
        startScanning(cameraToUse.id);
      } else {
        toast.error('No cameras found on this device');
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
      if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
        toast.error('Camera permission denied. Please allow camera access and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
      } else {
        toast.error('Unable to access camera. Please check your device settings.');
      }
    }
  };

  const findCameraByType = (devices: any[], type: 'front' | 'back') => {
    return devices.find(device => {
      const label = device.label.toLowerCase();
      if (type === 'back') {
        return (
          label.includes('back') || 
          label.includes('environment') ||
          label.includes('rear') ||
          label.includes('facing back') ||
          label.includes('camera2') ||
          label.includes('0, facing back') ||
          (label.includes('camera') && !label.includes('front') && !label.includes('user'))
        );
      } else {
        return (
          label.includes('front') ||
          label.includes('user') ||
          label.includes('facing front') ||
          label.includes('selfie') ||
          label.includes('camera1')
        );
      }
    });
  };

  const startScanning = async (cameraId: string) => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId);
      }

      // Determine facing mode based on camera type
      const facingMode = currentCameraType === 'back' ? 'environment' : 'user';

      const config = {
        fps: 8,
        qrbox: { width: Math.min(250, window.innerWidth - 80), height: Math.min(250, window.innerWidth - 80) },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      await scannerRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          console.log('QR Code detected:', decodedText);
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore frequent scan errors
        }
      );

      setIsScanning(true);
      toast.success(`Scanner ready! Using ${currentCameraType} camera.`);
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast.error('Failed to start camera. Please check permissions and try again.');
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (hasScanned || isProcessing || !decodedText || !decodedText.trim()) {
      console.log('Scan prevented - already processed or invalid data');
      return;
    }
    
    console.log('Processing QR scan:', decodedText);
    
    setHasScanned(true);
    setIsProcessing(true);
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    try {
      // Stop all video tracks aggressively
      const videoElement = document.getElementById(elementId)?.querySelector('video');
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped video track:', track.kind);
        });
      }
      
      // Stop scanner
      if (scannerRef.current) {
        try {
          if (isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (stopError) {
          console.log('Error stopping scanner, but continuing...', stopError);
        }
        scannerRef.current = null;
      }
      setIsScanning(false);
      
      toast.success('QR Code scanned successfully!');
      onScan(decodedText.trim());
      handleClose();
      
    } catch (error) {
      console.error('Error stopping scanner after scan:', error);
      onScan(decodedText.trim());
      handleClose();
    }
  };

  const cleanup = async () => {
    try {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      
      // Stop all video tracks
      const videoElement = document.getElementById(elementId)?.querySelector('video');
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Cleanup: Stopped video track:', track.kind);
        });
      }
      
      if (scannerRef.current) {
        try {
          if (isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (error) {
          console.log('Error during cleanup, but continuing...', error);
        }
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

  const toggleCamera = async () => {
    if (isProcessing || hasScanned || cameras.length <= 1) {
      return;
    }
    
    try {
      const newCameraType = currentCameraType === 'back' ? 'front' : 'back';
      const targetCamera = findCameraByType(cameras, newCameraType);
      
      if (targetCamera) {
        // Stop current scanner
        await cleanup();
        
        // Update camera type and start new scanner
        setCurrentCameraType(newCameraType);
        setSelectedCamera(targetCamera.id);
        setTorchEnabled(false); // Reset torch when switching cameras
        
        // Start new scanner with the target camera
        setTimeout(() => {
          startScanning(targetCamera.id);
        }, 100);
        
        toast.success(`Switched to ${newCameraType} camera`);
      } else {
        toast.error(`No ${newCameraType} camera found`);
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      toast.error('Failed to switch camera');
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
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Scan Tile QR Code
            <span className="text-sm text-gray-500 ml-auto">
              ({currentCameraType} camera)
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Scanner Container */}
          <div className="relative">
            <div 
              id={elementId}
              className="w-full rounded-lg overflow-hidden bg-gray-900"
              style={{ 
                minHeight: Math.min(300, window.innerHeight * 0.4),
                maxHeight: Math.min(400, window.innerHeight * 0.5)
              }}
            />
            
            {/* Controls Overlay */}
            {isScanning && !isProcessing && (
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTorch}
                  className="bg-white/90 hover:bg-white text-black border-white/50 h-8 w-8 p-0"
                  disabled={isProcessing || currentCameraType === 'front'}
                  title={currentCameraType === 'front' ? 'Flashlight not available on front camera' : 'Toggle flashlight'}
                >
                  {torchEnabled ? (
                    <FlashlightOff className="h-3 w-3" />
                  ) : (
                    <Flashlight className="h-3 w-3" />
                  )}
                </Button>
                
                {cameras.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCamera}
                    className="bg-white/90 hover:bg-white text-black border-white/50 h-8 w-8 p-0"
                    disabled={isProcessing}
                    title="Switch camera"
                  >
                    <SwitchCamera className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            
            {/* Status Overlay */}
            {(!isScanning || isProcessing) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                <div className="text-center text-white px-4">
                  <Camera className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 opacity-50" />
                  <p className="text-xs sm:text-sm">
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
              className="flex-1 h-11"
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleManualInput} 
              className="flex-1 h-11"
              disabled={isProcessing}
            >
              Manual Input
            </Button>
          </div>
          
          {/* Instructions */}
          <div className="text-center px-2">
            <p className="text-xs sm:text-sm text-gray-500">
              {isProcessing ? 'Processing your scan...' : `Point your ${currentCameraType} camera at a QR code to scan`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isProcessing ? 'Please wait...' : 'Ensure good lighting and hold steady'}
            </p>
            {cameras.length > 1 && !isProcessing && (
              <p className="text-xs text-gray-400 mt-1">
                Tap the camera icon to switch between front and back camera
              </p>
            )}
          </div>
          
          {/* Camera Info */}
          {isScanning && selectedCamera && !isProcessing && (
            <div className="text-xs text-gray-400 text-center">
              Using: {cameras.find(cam => cam.id === selectedCamera)?.label || `${currentCameraType} camera`}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
