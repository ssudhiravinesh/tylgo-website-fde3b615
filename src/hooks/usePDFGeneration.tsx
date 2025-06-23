
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Quotation } from '@/hooks/useQuotations';
import { useQuotationItems } from '@/hooks/useQuotationItems';
import { useRoomsByCustomer } from '@/hooks/useRooms';
import { useTiles } from '@/hooks/useTiles';

export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    try {
      // Fetch quotation items to include in PDF
      const { data: quotationItems = [] } = await fetch(`https://onucizagpgwdpcakskat.supabase.co/rest/v1/quotation_items?quotation_id=eq.${quotation.id}&select=*,room:rooms(name,length,width,unit),tile:tiles(name,code,price_per_sqm)`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWNpemFncGd3ZHBjYWtza2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODA0NDUsImV4cCI6MjA2NjE1NjQ0NX0.c7Ihw4a38Xa37ygQyF1sjiApLsayTQLvs5QvPtsIozM',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWNpemFncGd3ZHBjYWtza2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODA0NDUsImV4cCI6MjA2NjE1NjQ0NX0.c7Ihw4a38Xa37ygQyF1sjiApLsayTQLvs5QvPtsIozM'
        }
      }).then(res => res.json());

      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Generate items rows for the table
      const itemsRows = quotationItems.map((item: any) => `
        <tr>
          <td>${item.room?.name || 'N/A'}</td>
          <td>${item.tile?.name || 'N/A'} (${item.tile?.code || 'N/A'})</td>
          <td>${item.quantity} m²</td>
          <td>₹${(item.unit_price || 0).toLocaleString()}</td>
          <td>₹${(item.total_price || 0).toLocaleString()}</td>
        </tr>
      `).join('');

      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotation ${quotation.quotation_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            .company-name { font-size: 28px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
            .quotation-title { font-size: 24px; margin-bottom: 20px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info, .quotation-info { width: 45%; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #007bff; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .info-row { margin-bottom: 8px; }
            .label { font-weight: bold; color: #555; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .items-table th { background-color: #f8f9fa; font-weight: bold; }
            .total-section { text-align: right; margin-top: 30px; }
            .total-row { font-size: 20px; font-weight: bold; color: #007bff; padding: 10px 0; border-top: 2px solid #007bff; }
            .notes-section { margin-top: 40px; }
            .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Tile Solutions</div>
            <div class="quotation-title">QUOTATION</div>
          </div>
          
          <div class="details">
            <div class="customer-info">
              <div class="section-title">Customer Details</div>
              <div class="info-row"><span class="label">Name:</span> ${quotation.customer?.name || 'N/A'}</div>
              <div class="info-row"><span class="label">Mobile:</span> ${quotation.customer?.mobile || 'N/A'}</div>
            </div>
            
            <div class="quotation-info">
              <div class="section-title">Quotation Details</div>
              <div class="info-row"><span class="label">Quotation #:</span> ${quotation.quotation_number}</div>
              <div class="info-row"><span class="label">Date:</span> ${new Date(quotation.created_at).toLocaleDateString()}</div>
              <div class="info-row"><span class="label">Status:</span> ${quotation.status.toUpperCase()}</div>
              <div class="info-row"><span class="label">Created by:</span> ${quotation.worker?.name || 'N/A'}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Tile</th>
                <th>Quantity</th>
                <th>Unit Price (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No items found</td></tr>'}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              Total Amount: ₹${(quotation.total_cost || 0).toLocaleString()}
            </div>
          </div>

          ${quotation.notes ? `
            <div class="notes-section">
              <div class="section-title">Additional Notes</div>
              <p>${quotation.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for choosing Tile Solutions!</p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      toast.success('PDF generation initiated');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateQuotationPDF };
};
