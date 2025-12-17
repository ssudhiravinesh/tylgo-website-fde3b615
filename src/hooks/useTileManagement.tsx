import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tile } from './useTiles';
import QRCode from 'qrcode';
import { getShowroomId } from './useShowroom';

const generateQRCode = async (tileCode: string, tileId: string): Promise<string | null> => {
  try {
    // Generate QR code with only the tile code (not the full URL)
    const qrDataUrl = await QRCode.toDataURL(tileCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Convert data URL to blob
    const response = await fetch(qrDataUrl);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const fileName = `${tileCode}-qr.png`;
    const { data, error } = await supabase.storage
      .from('tile-qrs')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading QR code:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tile-qrs')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

export const useCreateTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileData: Omit<Tile, 'id' | 'created_at' | 'updated_at' | 'qr_code_url'>) => {
      console.log('Creating tile with data:', tileData);

      // Get showroom_id
      const showroom_id = await getShowroomId();
      if (!showroom_id) {
        throw new Error('No showroom assigned to user');
      }
      
      const { data, error } = await supabase
        .from('tiles')
        .insert([{ ...tileData, showroom_id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating tile:', error);
        throw error;
      }

      console.log('Tile created successfully:', data);

      // Generate QR code after tile creation
      const qrCodeUrl = await generateQRCode(data.code, data.id);
      
      if (qrCodeUrl) {
        // Update tile with QR code URL
        const { error: updateError } = await supabase
          .from('tiles')
          .update({ qr_code_url: qrCodeUrl })
          .eq('id', data.id);

        if (updateError) {
          console.error('Error updating tile with QR code URL:', updateError);
        } else {
          data.qr_code_url = qrCodeUrl;
        }
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('Tile creation mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile created successfully with QR code');
    },
    onError: (error: any) => {
      console.error('Tile creation mutation failed:', error);
      if (error.code === '23505' && error.message.includes('tiles_code_key')) {
        toast.error('A tile with this code already exists');
      } else {
        toast.error(error.message || 'Error creating tile');
      }
    },
  });
};

export const useUpdateTile = (skipToast = false) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: Partial<Tile> & { id: string }) => {
      const { id, ...updates } = updateData;
      console.log('Updating tile:', id, 'with data:', updates);
      
      const { data, error } = await supabase
        .from('tiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating tile:', error);
        throw error;
      }

      console.log('Tile updated successfully:', data);

      // Regenerate QR code if code was updated
      if (updates.code) {
        const qrCodeUrl = await generateQRCode(data.code, data.id);
        
        if (qrCodeUrl) {
          const { error: updateError } = await supabase
            .from('tiles')
            .update({ qr_code_url: qrCodeUrl })
            .eq('id', data.id);

          if (updateError) {
            console.error('Error updating QR code URL:', updateError);
          } else {
            data.qr_code_url = qrCodeUrl;
          }
        }
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('Tile update mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      if (!skipToast) {
        toast.success('Tile updated successfully');
      }
    },
    onError: (error: any) => {
      console.error('Tile update mutation failed:', error);
      if (!skipToast) {
        if (error.code === '23505' && error.message.includes('tiles_code_key')) {
          toast.error('A tile with this code already exists');
        } else {
          toast.error(error.message || 'Error updating tile');
        }
      }
    },
  });
};

export const useDeleteTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileId: string) => {
      console.log('Soft deleting tile (marking as inactive):', tileId);
      
      const { error } = await supabase
        .from('tiles')
        .update({ is_active: false })
        .eq('id', tileId);

      if (error) {
        console.error('Error deactivating tile:', error);
        throw error;
      }

      console.log('Tile deactivated successfully');
    },
    onSuccess: () => {
      console.log('Tile deactivation mutation succeeded');
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('Tile removed successfully');
    },
    onError: (error: any) => {
      console.error('Tile deactivation mutation failed:', error);
      toast.error(error.message || 'Error removing tile');
    },
  });
};

export const useGenerateQRForTile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tileId: string) => {
      const { data: tile, error } = await supabase
        .from('tiles')
        .select('*')
        .eq('id', tileId)
        .single();

      if (error || !tile) {
        throw new Error('Tile not found');
      }

      const qrCodeUrl = await generateQRCode(tile.code, tile.id);
      
      if (!qrCodeUrl) {
        throw new Error('Failed to generate QR code');
      }

      const { error: updateError } = await supabase
        .from('tiles')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', tileId);

      if (updateError) {
        throw updateError;
      }

      return qrCodeUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiles'] });
      toast.success('QR code generated successfully');
    },
    onError: (error: any) => {
      console.error('QR generation failed:', error);
      toast.error(error.message || 'Failed to generate QR code');
    },
  });
};
