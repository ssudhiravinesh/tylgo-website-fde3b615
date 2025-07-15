import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TileCalculationResult } from '@/utils/tileCalculations';

interface PDFGenerationData {
  quotationNumber: string;
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  workerName: string;
  calculations: TileCalculationResult[];
  totalCost: number;
  wastagePercentage: number;
  notes?: string;
}

export const usePDFGeneration = () => {
  return useMutation({
    mutationFn: async (data: PDFGenerationData) => {
      console.log('Generating PDF with data:', data);
      
      // Transform calculations to match the expected format
      const formattedCalculations = data.calculations.map(calc => ({
        ...calc,
        rawTilesNeeded: calc.rawTilesNeeded, // Use the correct property name
        tile: {
          ...calc.tile,
          price_per_box: calc.tile.price_per_box,
          pieces_per_box: calc.tile.pieces_per_box,
        },
        totalArea: calc.totalArea,
        boxesNeeded: calc.boxesNeeded,
        orderedTiles: calc.orderedTiles,
        fullBoxes: calc.fullBoxes,
        leftoverTiles: calc.leftoverTiles,
        totalPrice: calc.totalPrice,
        isWallTile: calc.isWallTile,
        rooms: calc.rooms,
      }));

      try {
        const { data: result, error } = await supabase.functions.invoke('generate-quotation-pdf', {
          body: {
            ...data,
            calculations: formattedCalculations,
          },
        });

        if (error) {
          console.error('PDF generation error:', error);
          throw error;
        }

        console.log('PDF generated successfully:', result);
        return result;
      } catch (error) {
        console.error('Failed to generate PDF:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('PDF generation successful:', data);
      toast.success('PDF generated successfully!');
    },
    onError: (error: any) => {
      console.error('PDF generation failed:', error);
      toast.error(error.message || 'Failed to generate PDF');
    },
  });
};
