
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertTriangle, Camera, Shield } from 'lucide-react';

interface CameraErrorCardProps {
  cameraError: string;
  debugInfo: string;
  onRetryCamera: () => void;
}

export const CameraErrorCard: React.FC<CameraErrorCardProps> = ({
  cameraError,
  debugInfo,
  onRetryCamera
}) => {
  const isPermissionDenied = cameraError.includes('permission denied') || cameraError.includes('NotAllowedError');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-gray-600 flex items-center justify-center gap-2">
          {isPermissionDenied ? <Shield className="h-5 w-5 text-red-500" /> : <Camera className="h-5 w-5" />}
          Camera Access Required
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {isPermissionDenied ? (
          <div className="space-y-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-800 mb-2">Camera Permission Blocked</p>
              <p className="text-xs text-red-700">
                Your browser has blocked camera access. Please follow these steps:
              </p>
            </div>
            
            <div className="text-left bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">How to enable camera access:</p>
              <ol className="list-decimal list-inside text-xs text-blue-700 space-y-1">
                <li>Look for the camera icon in your browser's address bar</li>
                <li>Click on it and select "Allow" for camera access</li>
                <li>If no icon appears, click the lock/shield icon next to the URL</li>
                <li>Set Camera permissions to "Allow"</li>
                <li>Refresh the page and try again</li>
              </ol>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            {cameraError || "Unable to access camera. Please check permissions and try again."}
          </p>
        )}
        
        {debugInfo && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer font-medium mb-2">Technical Details</summary>
            <div className="bg-gray-50 p-2 rounded border font-mono whitespace-pre-wrap max-h-32 overflow-y-auto text-left">
              {debugInfo}
            </div>
          </details>
        )}
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onRetryCamera}
            className="flex-1 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 space-y-2">
          <p><strong>Still having issues?</strong></p>
          <ul className="list-disc list-inside text-left space-y-1">
            <li>Make sure you're using HTTPS (secure connection)</li>
            <li>Try a different browser (Chrome, Firefox, Safari work best)</li>
            <li>Close other apps that might be using the camera</li>
            <li>Restart your browser and try again</li>
            <li>On mobile: ensure the browser app has camera permissions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
