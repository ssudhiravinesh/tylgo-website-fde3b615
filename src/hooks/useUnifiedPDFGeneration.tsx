import { useCallback, useState } from 'react';
import { generateQuotationHTML, generateTilesHTML, type TileData } from '@/utils/pdf/pdfGenerators';

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';



export const useUnifiedPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to wait for all images to load in a window
  const waitForAllImages = (win: Window): Promise<void> => {
    return new Promise((resolve) => {
      const images = Array.from(win.document.images);

      if (images.length === 0) {
        resolve();
        return;
      }

      const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>(r => {
          img.onload = () => r();
          img.onerror = () => r();
        });
      });

      Promise.all(promises).then(() => resolve());
    });
  };

  // Get direct public URL for Supabase images - simplified for public bucket
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    setIsGenerating(true);
    try {
      console.log('[PDF Generation] Starting PDF generation for quotation:', quotation.quotation_number);

      const htmlContent = await generateQuotationHTML(quotation);

      const printWindow = window.open('', '_blank');

      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        await new Promise<void>(resolve => {
          if (printWindow.document.readyState === 'complete') {
            resolve();
          } else {
            printWindow.addEventListener('DOMContentLoaded', () => resolve());
          }
        });

        const style = printWindow.document.createElement('style');
        style.textContent = `
          @media screen {
            body { 
              color: #000 !important;
              background: white !important;
            }
          }
        `;
        printWindow.document.head.appendChild(style);

        if (printWindow.matchMedia) {
          const printMedia = printWindow.matchMedia('print');
        }

        console.log('[PDF Generation] Print media context prepared, waiting for images...');

        await waitForAllImages(printWindow);

        printWindow.focus();
        printWindow.print();

        console.log('[PDF Generation] ✓ PDF generation complete');

      } else {
        toast.error('Please allow popups to generate PDF');
      }
    } catch (error: any) {
      console.error('[PDF Generation] ✗ Error generating PDF:', error);
      toast.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateTilesPDF = useCallback(async (tiles: TileData[]) => {
    setIsGenerating(true);
    try {
      const htmlContent = generateTilesHTML(tiles);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        toast.success('PDF print dialog opened');
      } else {
        toast.error('Please allow popups to generate PDF');
      }
    } catch (error: any) {
      console.error('Error generating tiles PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateQuotationPDF,
    generateTilesPDF,
    isGenerating
  };
};
