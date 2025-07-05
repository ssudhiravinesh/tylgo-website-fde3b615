
import { useState, useCallback, useRef } from 'react';

export const useCameraAccess = () => {
  const [hasCamera, setHasCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async (onCameraReady?: () => void) => {
    try {
      console.log('Starting camera initialization...');
      setCameraError('');
      setDebugInfo('Initializing camera...\n');
      setHasCamera(false);
      
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported. Please use HTTPS or try a different browser.');
      }

      // Simple, progressive constraint approach
      const constraints = [
        // Best case: back camera with good resolution
        { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }, 
          audio: false 
        },
        // Fallback: any camera
        { 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          }, 
          audio: false 
        },
        // Basic fallback
        { video: true, audio: false }
      ];

      let mediaStream = null;
      let lastError = null;

      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(`Trying camera access attempt ${i + 1}...`);
          setDebugInfo(prev => prev + `Attempt ${i + 1}: Requesting camera access...\n`);
          
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          console.log('Camera access granted!');
          setDebugInfo(prev => prev + `Success! Camera stream obtained.\n`);
          break;
        } catch (error) {
          console.log(`Camera attempt ${i + 1} failed:`, error);
          setDebugInfo(prev => prev + `Attempt ${i + 1} failed: ${(error as Error).message}\n`);
          lastError = error;
          
          // If permission denied, don't try other constraints
          if ((error as Error).name === 'NotAllowedError') {
            break;
          }
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('Unable to access camera');
      }
      
      // Log camera details
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('Camera details:', {
          label: videoTrack.label,
          settings: videoTrack.getSettings()
        });
        setDebugInfo(prev => prev + `Camera: ${videoTrack.label}\n`);
      }
      
      setStream(mediaStream);
      setHasCamera(true);
      
      // Setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Wait for video to be ready
        const video = videoRef.current;
        
        const handleCanPlay = () => {
          console.log('Video ready to play');
          video.play().then(() => {
            console.log('Video playing successfully');
            if (onCameraReady) {
              setTimeout(() => onCameraReady(), 500);
            }
          }).catch(error => {
            console.error('Video play error:', error);
            setCameraError('Unable to start video playback');
          });
          video.removeEventListener('canplay', handleCanPlay);
        };

        video.addEventListener('canplay', handleCanPlay);
        
        // Fallback timeout
        setTimeout(() => {
          if (video.readyState >= 3) { // HAVE_FUTURE_DATA or better
            handleCanPlay();
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('Camera access error:', error);
      setHasCamera(false);
      
      let errorMessage = 'Unknown camera error';
      
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Camera permission denied. Please allow camera access and try again.';
            break;
          case 'NotFoundError':
            errorMessage = 'No camera found on this device.';
            break;
          case 'NotSupportedError':
            errorMessage = 'Camera not supported by this browser.';
            break;
          case 'NotReadableError':
            errorMessage = 'Camera is already in use by another application.';
            break;
          default:
            errorMessage = error.message;
        }
        setDebugInfo(prev => prev + `Final error: ${error.name} - ${error.message}\n`);
      }
      
      setCameraError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasCamera(false);
    setCameraError('');
    setDebugInfo('');
  }, [stream]);

  const retryCamera = useCallback(() => {
    stopCamera();
    setTimeout(() => startCamera(), 100);
  }, [startCamera, stopCamera]);

  return {
    hasCamera,
    stream,
    cameraError,
    debugInfo,
    videoRef,
    startCamera,
    stopCamera,
    retryCamera
  };
};
