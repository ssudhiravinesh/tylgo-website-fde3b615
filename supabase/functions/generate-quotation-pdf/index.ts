import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotationData {
  id: string;
  quotation_number: string;
  total_cost: number;
  wastage_percentage: number;
  notes?: string;
  customer: {
    name: string;
    mobile: string;
    address?: string;
    area?: string;
    state?: string;
  };
  worker: {
    name: string;
  };
  created_at: string;
}

const generateHTML = (quotation: QuotationData, quotationItems: any[], calculations: any[]) => {
  const currentDate = new Date().toLocaleDateString('en-IN');
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quotation ${quotation.quotation_number}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }
        
        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 5px;
        }
        
        .quotation-title {
          font-size: 24px;
          color: #374151;
          margin-bottom: 10px;
        }
        
        .quotation-number {
          font-size: 18px;
          color: #6b7280;
        }
        
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .info-block {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        
        .info-title {
          font-size: 16px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
        }
        
        .info-item {
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        .info-label {
          font-weight: 600;
          color: #374151;
        }
        
        .table-container {
          margin: 30px 0;
          overflow-x: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        th {
          background: #2563eb;
          color: white;
          font-weight: 600;
          padding: 12px 8px;
          text-align: left;
          font-size: 13px;
        }
        
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
        }
        
        tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-center {
          text-align: center;
        }
        
        .summary {
          margin-top: 30px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 5px 0;
        }
        
        .summary-label {
          font-weight: 600;
          color: #374151;
        }
        
        .summary-value {
          font-weight: 700;
          color: #1e40af;
        }
        
        .grand-total {
          border-top: 2px solid #2563eb;
          padding-top: 10px;
          margin-top: 15px;
          font-size: 18px;
        }
        
        .notes {
          margin-top: 30px;
          padding: 20px;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
        }
        
        .notes-title {
          font-weight: bold;
          color: #92400e;
          margin-bottom: 10px;
        }
        
        .notes-content {
          color: #78350f;
          line-height: 1.6;
        }
        
        .footer {
          margin-top: 40px;
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }
        
        @media print {
          .container {
            padding: 10mm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">TYLGO TILES</div>
          <div class="quotation-title">QUOTATION</div>
          <div class="quotation-number">#${quotation.quotation_number}</div>
        </div>
        
        <div class="info-section">
          <div class="info-block">
            <div class="info-title">Customer Details</div>
            <div class="info-item">
              <span class="info-label">Name:</span> ${quotation.customer.name}
            </div>
            <div class="info-item">
              <span class="info-label">Mobile:</span> ${quotation.customer.mobile}
            </div>
            ${quotation.customer.address ? `
              <div class="info-item">
                <span class="info-label">Address:</span> ${quotation.customer.address}
              </div>
            ` : ''}
            ${quotation.customer.area ? `
              <div class="info-item">
                <span class="info-label">Area:</span> ${quotation.customer.area}
              </div>
            ` : ''}
            ${quotation.customer.state ? `
              <div class="info-item">
                <span class="info-label">State:</span> ${quotation.customer.state}
              </div>
            ` : ''}
          </div>
          
          <div class="info-block">
            <div class="info-title">Quotation Details</div>
            <div class="info-item">
              <span class="info-label">Date:</span> ${new Date(quotation.created_at).toLocaleDateString('en-IN')}
            </div>
            <div class="info-item">
              <span class="info-label">Prepared By:</span> ${quotation.worker.name}
            </div>
            <div class="info-item">
              <span class="info-label">Wastage:</span> ${quotation.wastage_percentage}%
            </div>
            <div class="info-item">
              <span class="info-label">Valid Until:</span> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Tile Details</th>
                <th>Room</th>
                <th>Area (Sq Ft)</th>
                <th>Raw Tiles</th>
                <th>With Wastage</th>
                <th>Boxes Needed</th>
                <th>Rate/Box</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${calculations.map((calc, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>
                    <strong>${calc.tile.name}</strong><br>
                    <small>Code: ${calc.tile.code}</small><br>
                    <small>Size: ${calc.tile.size_length}×${calc.tile.size_breadth}mm</small>
                  </td>
                  <td>${calc.room.name}</td>
                  <td class="text-right">${calc.totalAreaSqFt}</td>
                  <td class="text-right">${calc.rawTilesNeeded}</td>
                  <td class="text-right">${calc.tilesWithWastage}</td>
                  <td class="text-right">${calc.boxesNeeded}</td>
                  <td class="text-right">₹${calc.tile.price_per_box}</td>
                  <td class="text-right">₹${calc.totalPrice.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Subtotal:</span>
            <span class="summary-value">₹${calculations.reduce((sum, calc) => sum + calc.totalPrice, 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Wastage Applied:</span>
            <span class="summary-value">${quotation.wastage_percentage}%</span>
          </div>
          <div class="summary-row grand-total">
            <span class="summary-label">Grand Total:</span>
            <span class="summary-value">₹${quotation.total_cost.toLocaleString('en-IN')}</span>
          </div>
        </div>
        
        ${quotation.notes ? `
          <div class="notes">
            <div class="notes-title">Notes:</div>
            <div class="notes-content">${quotation.notes}</div>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${currentDate} | This is a computer-generated document.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quotation } = await req.json();
    
    if (!quotation) {
      return new Response(
        JSON.stringify({ error: 'Quotation data is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Processing PDF generation for quotation:', quotation.quotation_number);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch quotation items with related data
    const { data: quotationItems, error: itemsError } = await supabase
      .from('quotation_items')
      .select(`
        *,
        rooms!quotation_items_room_id_fkey (
          id, name, length, width, wall_length, wall_height, room_type, unit
        ),
        tiles!quotation_items_tile_id_fkey (
          id, name, code, size_length, size_breadth, price_per_box, pieces_per_box
        )
      `)
      .eq('quotation_id', quotation.id);

    if (itemsError) {
      console.error('Error fetching quotation items:', itemsError);
      throw new Error('Failed to fetch quotation items');
    }

    // Process calculations
    const calculations = quotationItems?.map(item => {
      const room = item.rooms;
      const tile = item.tiles;
      const area = parseFloat(item.area.toString());
      
      // Convert area based on room unit
      let areaSqFt = area;
      if (room.unit === 'metre') {
        areaSqFt = area * 10.764; // Convert sq meters to sq feet
      }
      
      // Calculate tile requirements
      const tileAreaSqMm = tile.size_length * tile.size_breadth;
      const tileAreaSqFt = (tileAreaSqMm / 1000000) * 10.764;
      const rawTilesNeeded = Math.ceil(areaSqFt / tileAreaSqFt);
      const wastageMultiplier = 1 + (quotation.wastage_percentage / 100);
      const tilesWithWastage = Math.ceil(rawTilesNeeded * wastageMultiplier);
      const boxesNeeded = Math.ceil(tilesWithWastage / tile.pieces_per_box);
      
      return {
        tile,
        room,
        totalAreaSqFt: areaSqFt.toFixed(2),
        rawTilesNeeded,
        tilesWithWastage,
        boxesNeeded,
        totalPrice: parseFloat(item.total_price.toString())
      };
    }) || [];

    // Generate HTML
    const html = generateHTML(quotation, quotationItems || [], calculations);

    // Use Puppeteer to generate PDF
    const puppeteer = await import('https://deno.land/x/puppeteer@16.2.0/mod.ts');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    try {
      const page = await browser.newPage();
      
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        preferCSSPageSize: true
      });

      await browser.close();

      console.log('PDF generated successfully for quotation:', quotation.quotation_number);

      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Quotation_${quotation.quotation_number}.pdf"`,
          ...corsHeaders,
        },
      });

    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      await browser.close();
      throw pdfError;
    }

  } catch (error: any) {
    console.error('Error in generate-quotation-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate PDF. Please try again.' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);