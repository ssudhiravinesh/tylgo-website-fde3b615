
import React from 'react';
import { Button } from '@/components/ui/button';
import { Flashlight, FlashlightOff } from 'lucide-react';
import { toast } from 'sonner';

interface CameraControlsProps {
  stream: MediaStream | null;
  torchEnabled: boolean;
  setTorchEnabled: (enabled: boolean) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  stream,
  torchEnabled,
  setTorchEnabled
}) => {
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

  return (
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
  );
};
