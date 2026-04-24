
import React from 'react';

interface ScanningOverlayProps {
  isScanning: boolean;
}

export const ScanningOverlay: React.FC<ScanningOverlayProps> = ({ isScanning }) => {
  return (
    <>
      {/* Scanning frame overlay */}
      <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
        <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
      </div>

      {/* Scanning status indicator */}
      {isScanning && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
          Scanning...
        </div>
      )}
    </>
  );
};
