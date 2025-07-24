import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';
import type { Quotation } from '@/hooks/useQuotations';

export const useServerPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateQuotationPDF: generateClientPDF } = usePDFGeneration();

  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    setIsGenerating(true);
    try {
      console.log('Starting server-side PDF generation for quotation:', quotation.quotation_number);

      // Use the hardcoded Supabase URL since env vars aren't available
      const supabaseUrl = 'https://onucizagpgwdpcakskat.supabase.co';
      
      // Try server-side generation first
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-quotation-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ quotation }),
        });

        if (response.ok) {
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
          return;
        }
      } catch (serverError) {
        console.warn('Server-side PDF generation failed, falling back to client-side:', serverError);
      }

      // Fallback to client-side generation
      console.log('Using client-side PDF generation as fallback');
      await generateClientPDF(quotation);

    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [generateClientPDF]);

  return { generateQuotationPDF, isGenerating };
};