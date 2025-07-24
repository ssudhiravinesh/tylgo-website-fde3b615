import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Quotation } from '@/hooks/useQuotations';

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

export const useUnifiedPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuotationHTML = (quotation: Quotation): string => {
    // Calculate totals and group items
    const items = quotation.quotation_items || [];
    const groupedItems: { [tileId: string]: any } = {};
    
    items.forEach(item => {
      const tileId = item.tile_id;
      if (!groupedItems[tileId]) {
        groupedItems[tileId] = {
          tile: item.tile,
          rooms: [],
          totalArea: 0,
          totalPrice: 0
        };
      }
      groupedItems[tileId].rooms.push(item.room?.name || 'Unknown');
      groupedItems[tileId].totalArea += parseFloat(item.area?.toString() || '0');
      groupedItems[tileId].totalPrice += item.total_price;
    });

    const calculations = Object.values(groupedItems);
    const grandTotal = calculations.reduce((sum: number, calc: any) => sum + calc.totalPrice, 0);
    const wastagePercentage = quotation.wastage_percentage || 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quotation ${quotation.quotation_number}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 5px;
          }
          
          .quotation-title {
            font-size: 20px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 10px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          
          .info-section h3 {
            font-size: 16px;
            font-weight: 600;
            color: #3B82F6;
            margin-bottom: 10px;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 5px;
          }
          
          .info-section p {
            margin: 5px 0;
            font-size: 14px;
          }
          
          .table-container {
            margin: 30px 0;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          th {
            background: #3B82F6;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
          }
          
          td {
            padding: 12px 8px;
            border-bottom: 1px solid #E5E7EB;
            vertical-align: top;
            font-size: 13px;
          }
          
          tr:nth-child(even) {
            background: #F9FAFB;
          }
          
          tr:hover {
            background: #F3F4F6;
          }
          
          .tile-image {
            width: 40px;
            height: 40px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid #E5E7EB;
          }
          
          .total-section {
            margin-top: 30px;
            padding: 20px;
            background: #F8FAFC;
            border: 2px solid #3B82F6;
            border-radius: 8px;
            text-align: right;
          }
          
          .grand-total {
            font-size: 20px;
            font-weight: bold;
            color: #059669;
            margin-top: 10px;
          }
          
          .wastage-note {
            font-size: 12px;
            color: #6B7280;
            margin-top: 10px;
            text-align: center;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #6B7280;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Tile Solutions</div>
          <div class="quotation-title">QUOTATION</div>
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Customer Details</h3>
            <p><strong>Name:</strong> ${quotation.customer?.name || 'N/A'}</p>
            <p><strong>Mobile:</strong> ${quotation.customer?.mobile || 'N/A'}</p>
            ${quotation.customer?.area ? `<p><strong>Area:</strong> ${quotation.customer.area}</p>` : ''}
            ${quotation.customer?.state ? `<p><strong>State:</strong> ${quotation.customer.state}</p>` : ''}
            ${quotation.customer?.pincode ? `<p><strong>Pincode:</strong> ${quotation.customer.pincode}</p>` : ''}
          </div>
          
          <div class="info-section">
            <h3>Quotation Details</h3>
            <p><strong>Quotation No:</strong> ${quotation.quotation_number}</p>
            <p><strong>Date:</strong> ${new Date(quotation.created_at).toLocaleDateString('en-IN')}</p>
            <p><strong>Created by:</strong> ${quotation.worker?.name || 'N/A'}</p>
            <p><strong>Status:</strong> ${quotation.status?.toUpperCase() || 'N/A'}</p>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Room(s) & Area</th>
                <th>Tile Details</th>
                <th>Image</th>
                <th>Tiles Required</th>
                <th>Boxes</th>
                <th>Price/Box</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${calculations.map((calc: any) => {
                const tile = calc.tile;
                const rooms = Array.from(new Set(calc.rooms)).join(', ');
                const tileSize = tile ? `${(tile.size_length / 10).toFixed(1)} × ${(tile.size_breadth / 10).toFixed(1)} cm` : 'N/A';
                
                // Calculate tiles needed with wastage
                const tileLengthFt = (tile?.size_length || 0) / 304.8;
                const tileBreadthFt = (tile?.size_breadth || 0) / 304.8;
                const tileAreaSqFt = tileLengthFt * tileBreadthFt;
                const basicTilesNeeded = tileAreaSqFt > 0 ? Math.ceil(calc.totalArea / tileAreaSqFt) : 0;
                const tilesWithWastage = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
                const boxes = tile?.pieces_per_box ? Math.ceil(tilesWithWastage / tile.pieces_per_box) : 0;
                
                return `
                  <tr>
                    <td>
                      <strong>${rooms}</strong><br>
                      <small>${calc.totalArea.toFixed(2)} sq ft</small>
                    </td>
                    <td>
                      <strong>${tile?.name || 'N/A'}</strong><br>
                      <small>Code: ${tile?.code || 'N/A'}</small><br>
                      <small>Size: ${tileSize}</small>
                    </td>
                    <td>
                      ${tile?.image_url ? `<img src="${tile.image_url}" class="tile-image" alt="Tile" />` : '<div class="tile-image" style="background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:10px;color:#9ca3af;">No Image</div>'}
                    </td>
                    <td>
                      ${tilesWithWastage} tiles<br>
                      <small style="color:#6b7280;">+${wastagePercentage}% wastage</small>
                    </td>
                    <td>${boxes}</td>
                    <td>₹${tile?.price_per_box?.toLocaleString('en-IN') || '0'}</td>
                    <td><strong>₹${calc.totalPrice.toLocaleString('en-IN')}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="total-section">
          <div class="grand-total">
            Grand Total: ₹${grandTotal.toLocaleString('en-IN')}
          </div>
          <div class="wastage-note">
            All calculations include ${wastagePercentage}% wastage allowance
          </div>
        </div>
        
        ${quotation.notes ? `
          <div style="margin-top: 30px; padding: 15px; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; color: #92400E;">Notes:</h4>
            <p style="margin: 0; color: #78350F;">${quotation.notes}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
          <p>This is a computer-generated quotation and does not require a signature.</p>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
  };

  const generateTilesHTML = (tiles: TileData[]): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Tiles Inventory Report</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 5px;
          }
          
          .report-title {
            font-size: 20px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 10px;
          }
          
          .report-info {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 20px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          th {
            background: #3B82F6;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
          }
          
          td {
            padding: 12px 8px;
            border-bottom: 1px solid #E5E7EB;
            vertical-align: top;
            font-size: 13px;
          }
          
          tr:nth-child(even) {
            background: #F9FAFB;
          }
          
          tr:hover {
            background: #F3F4F6;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #6B7280;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Tile Solutions</div>
          <div class="report-title">TILES INVENTORY REPORT</div>
        </div>
        
        <div class="report-info">
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
          <p><strong>Total Tiles:</strong> ${tiles.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Size (cm)</th>
              <th>Price/Box</th>
              <th>Pieces/Box</th>
            </tr>
          </thead>
          <tbody>
            ${tiles.map(tile => `
              <tr>
                <td><strong>${tile.code}</strong></td>
                <td>${tile.name}</td>
                <td>${tile.category || 'N/A'}</td>
                <td>${(tile.size_length / 10).toFixed(1)} × ${(tile.size_breadth / 10).toFixed(1)}</td>
                <td>${tile.price_per_box != null ? `₹${tile.price_per_box.toLocaleString('en-IN')}` : 'N/A'}</td>
                <td>${tile.pieces_per_box || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is a computer-generated report.</p>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
  };

  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    setIsGenerating(true);
    try {
      const htmlContent = generateQuotationHTML(quotation);
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Focus the print window
        printWindow.focus();
        
        toast.success('PDF print dialog opened');
      } else {
        toast.error('Please allow popups to generate PDF');
      }
    } catch (error: any) {
      console.error('Error generating quotation PDF:', error);
      toast.error('Failed to generate PDF');
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
        
        // Focus the print window
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

// For backward compatibility
export const useServerPDFGeneration = useUnifiedPDFGeneration;