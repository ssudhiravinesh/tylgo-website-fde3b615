
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuotationEmailRequest {
  quotation: {
    id: string;
    quotation_number: string;
    customer_id: string;
    total_cost: number;
    notes?: string;
    created_at: string;
    status: string;
    customer?: {
      name: string;
      mobile: string;
    };
    worker?: {
      name: string;
    };
  };
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quotation, recipientEmail }: QuotationEmailRequest = await req.json();

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; border: 1px solid #ddd; }
          .quotation-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .total { font-size: 18px; font-weight: bold; color: #007bff; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tile Solutions</h1>
            <h2>Quotation ${quotation.quotation_number}</h2>
          </div>
          
          <div class="content">
            <p>Dear ${quotation.customer?.name || 'Valued Customer'},</p>
            
            <p>Thank you for your interest in our tile solutions. Please find your quotation details below:</p>
            
            <div class="quotation-details">
              <h3>Quotation Details</h3>
              <p><strong>Quotation Number:</strong> ${quotation.quotation_number}</p>
              <p><strong>Date:</strong> ${new Date(quotation.created_at).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${quotation.status.toUpperCase()}</p>
              <p><strong>Created by:</strong> ${quotation.worker?.name || 'Our Team'}</p>
              <br>
              <p class="total">Total Amount: ₹${(quotation.total_cost || 0).toLocaleString()}</p>
            </div>
            
            ${quotation.notes ? `
              <div class="quotation-details">
                <h3>Additional Notes</h3>
                <p>${quotation.notes}</p>
              </div>
            ` : ''}
            
            <p>This quotation is valid for 30 days from the date of issue. If you have any questions or would like to proceed with this quotation, please don't hesitate to contact us.</p>
            
            <p>Thank you for choosing Tile Solutions!</p>
            
            <p>Best regards,<br>
            The Tile Solutions Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email address.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Tile Solutions <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Quotation ${quotation.quotation_number} - Tile Solutions`,
      html: emailHTML,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-quotation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
