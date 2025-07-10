import { useState, useCallback, useRef } from 'react';

export const useCameraAccess = () => {
  const [hasCamera, setHasCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const waitForVideoReady = (video: HTMLVideoElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video ready timeout'));
      }, 10000); // 10 second timeout

      const checkReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          clearTimeout(timeout);
          console.log('Video is ready:', video.videoWidth, 'x', video.videoHeight);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  };

  const startCamera = useCallback(async (onCameraReady?: () => void) => {
    try {
      console.log('Starting camera initialization...');
      setCameraError('');
      setDebugInfo('Initializing camera...\n');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      await checkCameraPermissions();
      const devices = await detectDevices();
      
      if (devices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Optimized constraints for mobile QR scanning
      const constraintOptions = [
        // High-resolution back camera with autofocus (best for QR scanning)
        { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            focusMode: 'continuous',
            exposureMode: 'continuous'
          }, 
          audio: false 
        },
        // Standard back camera
        { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }, 
          audio: false 
        },
        // Any camera with good resolution
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

        // Apply additional mobile-optimized settings
        try {
          if ('applyConstraints' in track) {
            await track.applyConstraints({
              focusMode: 'continuous',
              exposureMode: 'continuous',
              whiteBalanceMode: 'continuous'
            } as any);
          }
        } catch (error) {
          console.log('Could not apply advanced constraints:', error);
        }
      }
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Mobile-optimized video settings
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.autoplay = true;
        
        try {
          // Wait for video to load and start playing
          await video.play();
          console.log('Video started playing');
          setDebugInfo(prev => prev + 'Video playing...\n');
          
          // Wait for video to be fully ready with actual dimensions
          await waitForVideoReady(video);
          console.log('Video fully ready with dimensions:', video.videoWidth, 'x', video.videoHeight);
          setDebugInfo(prev => prev + `Video ready: ${video.videoWidth}x${video.videoHeight}\n`);
          
          setHasCamera(true);
          
          // Now it's safe to start QR scanning
          if (onCameraReady) {
            onCameraReady();
          }
          
        } catch (error) {
          console.error('Error starting video playback:', error);
          throw new Error('Failed to start video playback: ' + (error as Error).message);
        }
      } else {
        throw new Error('Video element not available');
      }
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCamera(false);
      
      // Clean up stream if it was created
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
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
  }, []);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
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
    setCameraError('');
    setDebugInfo('');
  }, [stream]);

  const retryCamera = useCallback(() => {
    setCameraError('');
    setDebugInfo('');
    setHasCamera(false);
    startCamera();
  }, [startCamera]);

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