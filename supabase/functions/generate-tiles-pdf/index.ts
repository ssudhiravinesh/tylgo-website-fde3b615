import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TileData {
  id: string;
  code: string;
  name: string;
  category?: string;
  size_length: number;
  size_breadth: number;
  price_per_box?: number | null;
  pieces_per_box?: number | null;
}

const generateTilesHTML = (tiles: TileData[]) => {
  const currentDate = new Date().toLocaleDateString('en-IN');
  const currentTime = new Date().toLocaleTimeString('en-IN');
  
  const tilesRows = tiles.map((tile, index) => {
    const dims = tile.size_length >= 1000 || tile.size_breadth >= 1000
      ? `${(tile.size_length / 1000).toFixed(2)} × ${(tile.size_breadth / 1000).toFixed(2)} m`
      : tile.size_length >= 100 || tile.size_breadth >= 100
        ? `${(tile.size_length / 10).toFixed(1)} × ${(tile.size_breadth / 10).toFixed(1)} cm`
        : `${tile.size_length} × ${tile.size_breadth} mm`;

    const priceDisplay = tile.price_per_box 
      ? `₹${parseFloat(String(tile.price_per_box)).toLocaleString('en-IN')}`
      : 'N/A';

    return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><strong>${tile.code || 'N/A'}</strong></td>
        <td>${tile.name || 'Unknown Tile'}</td>
        <td>${tile.category || 'General'}</td>
        <td class="text-center">${dims}</td>
        <td class="text-right">
          ${priceDisplay}
          ${tile.pieces_per_box ? `<br><small style="color:#666;">(${tile.pieces_per_box} pcs/box)</small>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tiles Inventory Report</title>
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
          padding: 20mm;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #007bff;
        }
        
        .company-name {
          font-size: 42px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 10px;
          letter-spacing: 2px;
        }
        
        .orange-g {
          color: #ff8c00;
          font-weight: bold;
        }
        
        .report-title {
          font-size: 24px;
          color: #555;
          font-weight: 600;
          margin-top: 5px;
        }
        
        .meta-info {
          text-align: center;
          margin-bottom: 25px;
          font-size: 14px;
          color: #666;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 12px 8px;
          vertical-align: top;
        }
        
        th {
          background: #f8f9fa;
          font-weight: bold;
          font-size: 11px;
          text-align: left;
          color: #333;
        }
        
        tr:nth-child(even) {
          background: #fdfdfd;
        }
        
        .text-center {
          text-align: center;
        }
        
        .text-right {
          text-align: right;
        }
        
        .summary {
          margin-top: 20px;
          text-align: center;
          font-size: 16px;
          color: #007bff;
          font-weight: 600;
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
        }
        
        .footer {
          text-align: center;
          margin-top: 25px;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        
        @media print {
          body {
            padding: 10mm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">TYL<span class="orange-g">G</span>O</div>
        <div class="report-title">TILES INVENTORY REPORT</div>
      </div>
      
      <div class="meta-info">
        <div>Generated on: ${currentDate} at ${currentTime}</div>
        <div>Total Tiles: ${tiles.length}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width:8%;" class="text-center">S.No.</th>
            <th style="width:15%;">Code</th>
            <th style="width:25%;">Name</th>
            <th style="width:15%;">Category</th>
            <th style="width:20%;" class="text-center">Size</th>
            <th style="width:17%;" class="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          ${tilesRows}
        </tbody>
      </table>
      
      <div class="summary">
        <strong>Total Tiles in Inventory: ${tiles.length}</strong>
      </div>
      
      <div class="footer">
        <p><strong>TYLGO Tiles Inventory Management System</strong></p>
        <p>This report contains all tiles currently available in the system.</p>
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
    const { tiles } = await req.json();
    
    if (!tiles || !Array.isArray(tiles)) {
      return new Response(
        JSON.stringify({ error: 'Tiles data is required and must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Processing tiles PDF generation for', tiles.length, 'tiles');

    // Generate HTML
    const html = generateTilesHTML(tiles);

    // Try using Puppeteer with proper serverless configuration
    try {
      const puppeteer = await import('https://deno.land/x/puppeteer@16.2.0/mod.ts');
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--user-data-dir=/tmp/chrome-user-data',
          '--data-path=/tmp/chrome-data',
          '--disk-cache-dir=/tmp/chrome-cache'
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

        console.log('PDF generated successfully for tiles inventory');

        const timestamp = new Date().toISOString().slice(0, 10);
        return new Response(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Tiles-Inventory-${timestamp}.pdf"`,
            ...corsHeaders,
          },
        });

      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        await browser.close();
        throw pdfError;
      }

    } catch (puppeteerError) {
      console.error('Puppeteer initialization failed:', puppeteerError);
      
      // If Puppeteer fails, return the HTML content instead and let client handle it
      const timestamp = new Date().toISOString().slice(0, 10);
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'X-PDF-Generation-Failed': 'true',
          'X-Filename': `Tiles-Inventory-${timestamp}.pdf`,
          ...corsHeaders,
        },
      });
    }

  } catch (error: any) {
    console.error('Error in generate-tiles-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate tiles PDF. Please try again.' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);