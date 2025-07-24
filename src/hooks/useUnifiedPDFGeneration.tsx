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

const createPrintWindow = (html: string, filename: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    
    // Clean up after printing
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  };
};

const generateQuotationHTML = (quotation: Quotation) => {
  const items = quotation.quotation_items || [];
  
  const itemRows = items.map(item => {
    const boxes = Math.ceil(item.area / ((item.tile?.size_length || 1) * (item.tile?.size_breadth || 1) / 10000) / (item.tile?.pieces_per_box || 1));
    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.room?.name || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.tile?.code || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.tile ? `${item.tile.size_length} × ${item.tile.size_breadth}` : 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${boxes}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.price_per_box?.toLocaleString('en-IN') ?? '0'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.total_price.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quotation ${quotation.quotation_number}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          @page { size: A4; margin: 0.5in; }
        }
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .info { margin-bottom: 20px; }
        .customer { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #3476eb; color: white; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
        td { padding: 8px; border: 1px solid #ddd; }
        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">QUOTATION</div>
      </div>
      
      <div class="info">
        <strong>Quotation No:</strong> ${quotation.quotation_number}<br>
        <strong>Date:</strong> ${new Date(quotation.created_at).toLocaleDateString('en-IN')}
      </div>
      
      <div class="customer">
        <strong>Bill To:</strong><br>
        ${quotation.customer?.name || 'N/A'}<br>
        Mobile: ${quotation.customer?.mobile || 'N/A'}<br>
        ${quotation.customer?.address ? `Address: ${quotation.customer.address}` : ''}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Room</th>
            <th>Tile Code</th>
            <th>Size (cm)</th>
            <th>Boxes</th>
            <th>Price/Box</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      
      <div class="total">
        Grand Total: ₹${quotation.total_cost.toLocaleString('en-IN')}
      </div>
    </body>
    </html>
  `;
};

const generateTilesHTML = (tiles: TileData[]) => {
  const tileRows = tiles.map(tile => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${tile.code}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${tile.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${tile.size_length} × ${tile.size_breadth}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${tile.price_per_box != null ? `₹${tile.price_per_box.toLocaleString('en-IN')}` : '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${tile.pieces_per_box?.toString() || '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tiles Inventory</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          @page { size: A4; margin: 0.5in; }
        }
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .info { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #3476eb; color: white; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
        td { padding: 8px; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">TILES INVENTORY</div>
      </div>
      
      <div class="info">
        <strong>Generated on:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
        <strong>Total Tiles:</strong> ${tiles.length}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Size (cm)</th>
            <th>Price/Box</th>
            <th>Pieces/Box</th>
          </tr>
        </thead>
        <tbody>
          ${tileRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
};

export const useUnifiedPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuotationPDF = useCallback(
    async (quotation: Quotation) => {
      setIsGenerating(true);
      try {
        const html = generateQuotationHTML(quotation);
        createPrintWindow(html, `Quotation_${quotation.quotation_number}.pdf`);
        toast.success('PDF ready for printing/saving');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to generate quotation PDF.');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const generateTilesPDF = useCallback(
    async (tiles: TileData[]) => {
      setIsGenerating(true);
      try {
        const html = generateTilesHTML(tiles);
        createPrintWindow(html, 'Tiles-Inventory.pdf');
        toast.success('PDF ready for printing/saving');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to generate tiles PDF.');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generateQuotationPDF, generateTilesPDF, isGenerating };
};

// Legacy export alias for backward compatibility
export const useServerPDFGeneration = useUnifiedPDFGeneration;