
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';

export const useEmailSending = () => {
  const [isSending, setIsSending] = useState(false);

  const sendQuotationEmail = async (quotation: Quotation, recipientEmail: string) => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          quotation,
          recipientEmail,
        },
      });

      if (error) {
        throw error;
      }

      toast.success(`Quotation sent successfully to ${recipientEmail}`);
      return data;
    } catch (error: any) {
      
      toast.error(error.message || 'Failed to send email. Please try again.');
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return { sendQuotationEmail, isSending };
};
