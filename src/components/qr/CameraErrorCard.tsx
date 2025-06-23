
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

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
  return (
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
            onClick={onRetryCamera}
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
  );
};
