import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';

interface TileData {
  id: string;
  code: string;
  name: string;
  category?: string; // Make optional to match Tile interface
  size_length: number;
  size_breadth: number;
  price_per_box?: number | null; // Make optional to match Tile interface
  pieces_per_box?: number | null; // Make optional to match Tile interface
}

export const useServerPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const supabaseUrl = 'https://onucizagpgwdpcakskat.supabase.co';

  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    setIsGenerating(true);
    try {
      console.log('Starting server-side PDF generation for quotation:', quotation.quotation_number);

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-quotation-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ quotation }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to generate PDF (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle PDF blob response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation_${quotation.quotation_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF generated and downloaded successfully!');
      console.log('Server-side PDF generation completed successfully');

    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast.error(error.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [supabaseUrl]);

  const generateTilesPDF = useCallback(async (tiles: TileData[]) => {
    setIsGenerating(true);
    try {
      console.log('Starting server-side tiles PDF generation for', tiles.length, 'tiles');

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-tiles-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ tiles }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to generate tiles PDF (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle PDF blob response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `Tiles-Inventory-${timestamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Tiles PDF generated and downloaded successfully!');
      console.log('Server-side tiles PDF generation completed successfully');

    } catch (error: any) {
      console.error('Tiles PDF generation failed:', error);
      toast.error(error.message || 'Failed to generate tiles PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [supabaseUrl]);

  return { generateQuotationPDF, generateTilesPDF, isGenerating };
};