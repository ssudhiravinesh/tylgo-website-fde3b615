
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Flashlight, FlashlightOff } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (tileCode: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const stopCamera = useCallback(() => {
    stopScanning();
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    setHasCamera(false);
    setTorchEnabled(false);
    setCameraError('');
  }, [stream, stopScanning]);

  const startScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    
    const scanInterval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for QR detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      try {
        // Use jsQR to detect QR codes
        const qrResult = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (qrResult && qrResult.data) {
          console.log('QR Code detected:', qrResult.data);
          onScan(qrResult.data.trim());
          stopScanning();
          onClose();
        }
      } catch (error) {
        console.error('QR scanning error:', error);
      }
    }, 100);

    scanIntervalRef.current = scanInterval;
  }, [onScan, onClose, stopScanning]);

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      setCameraError('');
      
      // Try different constraint configurations, starting with the most preferred
      const constraintOptions = [
        {
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        {
          video: {
            facingMode: { exact: 'environment' }
          },
          audio: false
        },
        {
          video: {
            facingMode: 'environment'
          },
          audio: false
        },
        {
          video: true,
          audio: false
        }
      ];

      let mediaStream = null;
      let lastError = null;

      for (const constraints of constraintOptions) {
        try {
          console.log('Trying constraints:', constraints);
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('Camera stream obtained with constraints:', constraints);
          break;
        } catch (error) {
          console.log('Failed with constraints:', constraints, 'Error:', error);
          lastError = error;
          continue;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('Unable to access camera');
      }
      
      setStream(mediaStream);
      setHasCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready before starting to scan
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting playback...');
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Video playing, starting scan...');
              startScanning();
            }).catch(error => {
              console.error('Error playing video:', error);
              setCameraError('Error starting video playback');
            });
          }
        };

        videoRef.current.onerror = (error) => {
          console.error('Video error:', error);
          setCameraError('Video playback error');
        };
      }
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCamera(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please allow camera access and try again.');
        } else if (error.name === 'NotFoundError') {
          setCameraError('No camera found on this device.');
        } else if (error.name === 'NotSupportedError') {
          setCameraError('Camera not supported by this browser.');
        } else if (error.name === 'OverconstrainedError') {
          setCameraError('Camera constraints not supported. Trying fallback...');
          // Retry with basic constraints
          setTimeout(() => startCamera(), 1000);
        } else {
          setCameraError('Unable to access camera. Please check permissions and try again.');
        }
      } else {
        setCameraError('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  const toggleTorch = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !torchEnabled } as any]
          });
          setTorchEnabled(!torchEnabled);
        } catch (error) {
          console.error('Torch not supported:', error);
          toast.error('Flashlight not supported on this device');
        }
      }
    }
  };

  const handleManualInput = () => {
    const input = prompt('Enter the tile code:');
    if (input && input.trim()) {
      onScan(input.trim());
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleRetryCamera = () => {
    setCameraError('');
    setHasCamera(false);
    startCamera();
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
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-blue-500"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-blue-500"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-blue-500"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-blue-500"></div>
              </div>

              {/* Controls overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleTorch}
                  className="bg-black/50 hover:bg-black/70 text-white"
                >
                  {torchEnabled ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
                </Button>
              </div>

              {isScanning && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                  Scanning...
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-gray-600">Camera Not Available</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-gray-500">
                  {cameraError || "Please allow camera access or enter the tile code manually."}
                </p>
                {cameraError && (
                  <Button 
                    variant="outline" 
                    onClick={handleRetryCamera}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Retry Camera Access
                  </Button>
                )}
              </CardContent>
            </Card>
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
              : "Scan the QR code on a tile to select it for the room"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
