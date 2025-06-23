
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Flashlight, FlashlightOff, RefreshCw } from 'lucide-react';
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
  const [debugInfo, setDebugInfo] = useState<string>('');
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    stopScanning();
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasCamera(false);
    setTorchEnabled(false);
    setCameraError('');
    setDebugInfo('');
  }, [stream, stopScanning]);

  const startScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('Video or canvas ref not available');
      return;
    }

    console.log('Starting QR scanning...');
    setIsScanning(true);
    
    const scanInterval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;
      
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log('Video not ready, readyState:', video.readyState);
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        console.log('Invalid canvas dimensions:', canvas.width, canvas.height);
        return;
      }

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

  const checkCameraPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('Camera permission status:', permissions.state);
      setDebugInfo(prev => prev + `Camera permission: ${permissions.state}\n`);
      return permissions.state;
    } catch (error) {
      console.log('Could not check camera permissions:', error);
      return 'unknown';
    }
  };

  const detectDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoDevices.length);
      setDebugInfo(prev => prev + `Video devices found: ${videoDevices.length}\n`);
      return videoDevices;
    } catch (error) {
      console.error('Error enumerating devices:', error);
      return [];
    }
  };

  const startCamera = async () => {
    try {
      console.log('Starting camera initialization...');
      setCameraError('');
      setDebugInfo('Initializing camera...\n');
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Check permissions and devices
      await checkCameraPermissions();
      const devices = await detectDevices();
      
      if (devices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Try different constraint configurations
      const constraintOptions = [
        // Most basic - just video
        {
          video: true,
          audio: false
        },
        // Try with ideal dimensions
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        },
        // Try with back camera preference
        {
          video: {
            facingMode: 'environment'
          },
          audio: false
        },
        // Try with specific device if available
        ...(devices.length > 0 ? [{
          video: {
            deviceId: { exact: devices[0].deviceId }
          },
          audio: false
        }] : [])
      ];

      let mediaStream = null;
      let lastError = null;

      for (let i = 0; i < constraintOptions.length; i++) {
        const constraints = constraintOptions[i];
        try {
          console.log(`Trying constraints ${i + 1}:`, constraints);
          setDebugInfo(prev => prev + `Trying option ${i + 1}...\n`);
          
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('Camera stream obtained with constraints:', constraints);
          setDebugInfo(prev => prev + `Success with option ${i + 1}!\n`);
          break;
        } catch (error) {
          console.log(`Failed with constraints ${i + 1}:`, error);
          setDebugInfo(prev => prev + `Option ${i + 1} failed: ${(error as Error).message}\n`);
          lastError = error;
          continue;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('Unable to access camera with any configuration');
      }
      
      // Log stream details
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        console.log('Video track details:', {
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings()
        });
        setDebugInfo(prev => prev + `Using: ${track.label}\n`);
      }
      
      setStream(mediaStream);
      setHasCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Set up event handlers
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          if (videoRef.current) {
            console.log('Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            setDebugInfo(prev => prev + `Video: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}\n`);
          }
        };

        videoRef.current.oncanplay = () => {
          console.log('Video can play, starting playback...');
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Video playing, starting scan...');
              setTimeout(() => startScanning(), 500); // Small delay to ensure video is fully ready
            }).catch(error => {
              console.error('Error playing video:', error);
              setCameraError('Error starting video playback: ' + error.message);
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
        let errorMessage = '';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Camera not supported by this browser. Try using Chrome, Firefox, or Safari.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported by your device.';
        } else if (error.message.includes('Camera API not supported')) {
          errorMessage = 'Camera API not supported. Please use HTTPS or try a different browser.';
        } else {
          errorMessage = `Camera error: ${error.message}. Try refreshing the page or using a different browser.`;
        }
        setCameraError(errorMessage);
        setDebugInfo(prev => prev + `Error: ${error.name} - ${error.message}\n`);
      } else {
        setCameraError('Unknown camera error. Please try refreshing the page.');
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
    setDebugInfo('');
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
                <p className="text-sm text-gray-600">
                  {cameraError || "Unable to access camera. Please check permissions and try again."}
                </p>
                
                {debugInfo && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {debugInfo}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRetryCamera}
                    className="flex-1 gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Camera
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Troubleshooting tips:</strong></p>
                  <ul className="list-disc list-inside text-left space-y-1">
                    <li>Make sure you granted camera permission</li>
                    <li>Close other apps that might be using the camera</li>
                    <li>Try refreshing the page</li>
                    <li>Use HTTPS (secure connection) if possible</li>
                    <li>Try a different browser (Chrome, Firefox, Safari)</li>
                  </ul>
                </div>
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
              : "Use manual input to enter the tile code, or fix camera access and try again"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
