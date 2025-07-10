import { useRef, useCallback } from 'react';
import jsQR from 'jsqr';

export const useQRScanning = (onScan: (data: string) => void) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTime = useRef<number>(0);
  const isScanning = useRef<boolean>(false);

  const startScanning = useCallback((videoElement: HTMLVideoElement) => {
    if (!videoElement || !canvasRef.current) {
      console.log('Video or canvas ref not available');
      return;
    }

    if (isScanning.current) {
      console.log('Already scanning, stopping previous scan');
      stopScanning();
    }

    console.log('Starting QR scanning...');
    isScanning.current = true;
    
    const scanQR = () => {
      if (!isScanning.current) return;
      
      const canvas = canvasRef.current;
      const video = videoElement;
      
      if (!canvas || !video) {
        console.log('Canvas or video not available');
        return;
      }
      
      // Check if video is ready and has valid dimensions
      if (video.readyState < 2) {
        console.log('Video not ready, readyState:', video.readyState);
        return;
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Video dimensions not available:', video.videoWidth, video.videoHeight);
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        console.log('Canvas context not available');
        return;
      }

      try {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data from canvas
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        if (!imageData || imageData.data.length === 0) {
          console.log('No image data available');
          return;
        }

        // Scan for QR code with optimized options
        const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert', // Skip inversion for better performance
        });
        
        if (qrResult && qrResult.data && qrResult.data.trim()) {
          const currentTime = Date.now();
          
          // Prevent duplicate scans within 1 second
          if (currentTime - lastScanTime.current > 1000) {
            console.log('QR Code detected:', qrResult.data);
            lastScanTime.current = currentTime;
            
            // Stop scanning before calling onScan to prevent multiple calls
            stopScanning();
            
            // Call the callback with the detected data
            onScan(qrResult.data.trim());
            return;
          }
        }
      } catch (error) {
        console.error('QR scanning error:', error);
      }
    };

    // Start the scanning loop
    const scanInterval = setInterval(scanQR, 150); // Slightly slower for better performance
    scanIntervalRef.current = scanInterval;

    // Also do an immediate scan
    setTimeout(scanQR, 100);
  }, [onScan]);

  const stopScanning = useCallback(() => {
    console.log('Stopping QR scanning...');
    isScanning.current = false;
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  return {
    canvasRef,
    startScanning,
    stopScanning
  };
};