
import { useRef, useCallback } from 'react';
import jsQR from 'jsqr';

export const useQRScanning = (onScan: (data: string) => void) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScanning = useCallback((videoElement: HTMLVideoElement) => {
    if (!videoElement || !canvasRef.current) {
      console.log('Video or canvas ref not available');
      return;
    }

    console.log('Starting QR scanning...');
    
    const scanInterval = setInterval(() => {
      const canvas = canvasRef.current;
      
      if (!canvas) return;
      
      if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
        console.log('Video not ready, readyState:', videoElement.readyState);
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        console.log('Invalid canvas dimensions:', canvas.width, canvas.height);
        return;
      }

      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      try {
        const qrResult = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (qrResult && qrResult.data) {
          console.log('QR Code detected:', qrResult.data);
          onScan(qrResult.data.trim());
          stopScanning();
        }
      } catch (error) {
        console.error('QR scanning error:', error);
      }
    }, 100);

    scanIntervalRef.current = scanInterval;
  }, [onScan]);

  const stopScanning = useCallback(() => {
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
