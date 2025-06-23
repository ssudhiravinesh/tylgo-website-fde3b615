
import { Quotation } from "@/hooks/useQuotations";
import { QuotationItem } from "@/hooks/useQuotationItems";
import { supabase } from "@/integrations/supabase/client";

export const sendQuotationEmail = async (quotation: Quotation, items: QuotationItem[]): Promise<void> => {
  try {
    // Call the send-quotation-email edge function
    const { data, error } = await supabase.functions.invoke('send-quotation-email', {
      body: {
        quotation,
        items,
        customerEmail: quotation.customer?.mobile, // Using mobile as email for now
      },
    });

    if (error) {
      throw error;
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
