
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

      const constraintOptions = [
        { video: true, audio: false },
        { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: { facingMode: 'environment' }, audio: false },
        ...(devices.length > 0 ? [{ video: { deviceId: { exact: devices[0].deviceId } }, audio: false }] : [])
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
      }
      
      setStream(mediaStream);
      setHasCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
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
              console.log('Video playing');
              if (onCameraReady) {
                setTimeout(() => onCameraReady(), 500);
              }
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
