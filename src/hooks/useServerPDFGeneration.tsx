import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';

export const useServerPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    setIsGenerating(true);
    try {
      console.log('Starting server-side PDF generation for quotation:', quotation.quotation_number);

      // Get the Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Make direct fetch call to get the PDF blob
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-quotation-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ quotation }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

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
      console.log('PDF generation completed successfully');

    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast.error(error.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateQuotationPDF, isGenerating };
};