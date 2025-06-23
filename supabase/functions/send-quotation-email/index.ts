
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
    quotation_number: string;
    status: string;
    total_cost: number;
    created_at: string;
    notes?: string;
    customer?: {
      name: string;
      mobile: string;
    };
    worker?: {
      name: string;
    };
  };
  items: Array<{
    room?: {
      name: string;
      length: number;
      width: number;
      unit: string;
    };
    tile?: {
      name: string;
      code: string;
    };
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  customerEmail: string;
}

const generateEmailHTML = (data: QuotationEmailRequest) => {
  const { quotation, items } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .quotation-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #f3f4f6; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Quotation ${quotation.quotation_number}</h1>
            <p>Thank you for your interest in our services</p>
        </div>
        
        <div class="content">
            <div class="quotation-details">
                <h3>Dear ${quotation.customer?.name || 'Valued Customer'},</h3>
                <p>Please find below the quotation details for your tiling requirements:</p>
                
                <p><strong>Quotation Number:</strong> ${quotation.quotation_number}</p>
                <p><strong>Date:</strong> ${new Date(quotation.created_at).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${quotation.status.toUpperCase()}</p>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Room</th>
                        <th>Tile</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.room?.name || 'N/A'}<br><small>${item.room?.length}×${item.room?.width} ${item.room?.unit}</small></td>
                            <td>${item.tile?.name || 'N/A'}<br><small>${item.tile?.code || ''}</small></td>
                            <td>${item.quantity} sqm</td>
                            <td>₹${item.unit_price.toLocaleString()}</td>
                            <td>₹${item.total_price.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="total">
                Total Amount: ₹${quotation.total_cost?.toLocaleString() || '0'}
            </div>
            
            ${quotation.notes ? `
                <div class="quotation-details">
                    <h4>Additional Notes:</h4>
                    <p>${quotation.notes.replace(/\n/g, '<br>')}</p>
                </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Thank you for choosing our services!</p>
            <hr>
            <p><small>This is an automated email. Please do not reply to this email.</small></p>
        </div>
    </div>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: QuotationEmailRequest = await req.json();
    const { quotation, customerEmail } = requestData;

    // For demo purposes, we'll use a placeholder email
    // In production, you'd validate the customer email properly
    const emailToSend = customerEmail.includes('@') ? customerEmail : `${customerEmail}@example.com`;

    const emailResponse = await resend.emails.send({
      from: "Tile Management <onboarding@resend.dev>",
      to: [emailToSend],
      subject: `Quotation ${quotation.quotation_number} - Tile Installation Services`,
      html: generateEmailHTML(requestData),
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
