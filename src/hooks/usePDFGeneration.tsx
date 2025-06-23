
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Quotation } from '@/hooks/useQuotations';
import { useQuotationItems } from '@/hooks/useQuotationItems';
import { useRoomsByCustomer } from '@/hooks/useRooms';
import { useTiles } from '@/hooks/useTiles';
import { calculateAreaInSquareFeet, formatDimensions, formatArea } from '@/utils/unitConversions';

export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    try {
      // Fetch quotation items to include in PDF
      const { data: quotationItems = [] } = await fetch(`https://onucizagpgwdpcakskat.supabase.co/rest/v1/quotation_items?quotation_id=eq.${quotation.id}&select=*,room:rooms(name,length,width,unit),tile:tiles(name,code,price_per_sqm,size_length,size_breadth)`, {
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
      const itemsRows = quotationItems.map((item: any) => {
        const room = item.room;
        const tile = item.tile;
        
        // Calculate area in square feet if room dimensions are available
        let roomDetails = 'N/A';
        let areaInSqFt = 'N/A';
        
        if (room && room.length && room.width && room.unit) {
          const areaSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
          roomDetails = formatDimensions(room.length, room.width, room.unit);
          areaInSqFt = formatArea(areaSqFt);
        }

        // Calculate tile dimensions for display
        let tileDimensions = 'N/A';
        if (tile && tile.size_length && tile.size_breadth) {
          // Convert mm to the appropriate display unit based on size
          const lengthInMm = tile.size_length;
          const widthInMm = tile.size_breadth;
          
          if (lengthInMm >= 1000 || widthInMm >= 1000) {
            // Display in meters for large tiles
            const lengthInM = (lengthInMm / 1000).toFixed(2);
            const widthInM = (widthInMm / 1000).toFixed(2);
            tileDimensions = `${lengthInM} × ${widthInM} m`;
          } else if (lengthInMm >= 100 || widthInMm >= 100) {
            // Display in centimeters for medium tiles
            const lengthInCm = (lengthInMm / 10).toFixed(1);
            const widthInCm = (widthInMm / 10).toFixed(1);
            tileDimensions = `${lengthInCm} × ${widthInCm} cm`;
          } else {
            // Display in millimeters for small tiles
            tileDimensions = `${lengthInMm} × ${widthInMm} mm`;
          }
        }

        return `
          <tr>
            <td>
              <strong>${room?.name || 'N/A'}</strong><br/>
              <small style="color: #666;">Dimensions: ${roomDetails}</small><br/>
              <small style="color: #666;">Area: ${areaInSqFt}</small>
            </td>
            <td>
              <strong>${tile?.name || 'N/A'}</strong><br/>
              <small style="color: #666;">Code: ${tile?.code || 'N/A'}</small><br/>
              <small style="color: #666;">Size: ${tileDimensions}</small>
            </td>
            <td style="text-align: center;">${item.quantity || 0} sq ft</td>
            <td style="text-align: right;">₹${(item.unit_price || 0).toLocaleString()}</td>
            <td style="text-align: right; font-weight: bold;">₹${(item.total_price || 0).toLocaleString()}</td>
          </tr>
        `;
      }).join('');

      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotation ${quotation.quotation_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #007bff; padding-bottom: 20px; }
            .company-name { font-size: 32px; font-weight: bold; color: #007bff; margin-bottom: 8px; }
            .quotation-title { font-size: 24px; color: #555; margin-bottom: 20px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info, .quotation-info { width: 45%; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #007bff; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
            .info-row { margin-bottom: 10px; font-size: 14px; }
            .label { font-weight: bold; color: #555; width: 120px; display: inline-block; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .items-table th { background-color: #f8f9fa; font-weight: bold; padding: 15px 12px; border: 1px solid #ddd; text-align: left; }
            .items-table td { border: 1px solid #ddd; padding: 12px; vertical-align: top; }
            .items-table td small { color: #666; display: block; margin-top: 4px; font-size: 12px; }
            .items-table tr:nth-child(even) { background-color: #f9f9f9; }
            .total-section { text-align: right; margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; }
            .total-row { font-size: 24px; font-weight: bold; color: #007bff; padding: 15px 0; border-top: 3px solid #007bff; margin-top: 10px; }
            .notes-section { margin-top: 40px; padding: 20px; background-color: #fff9c4; border-left: 4px solid #ffc107; border-radius: 4px; }
            .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 2px solid #ddd; padding-top: 20px; }
            .footer p { margin: 8px 0; }
            @media print { 
              body { margin: 0; } 
              .header { page-break-inside: avoid; }
              .items-table { page-break-inside: auto; }
              .items-table tr { page-break-inside: avoid; }
            }
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
              ${quotation.customer?.address ? `<div class="info-row"><span class="label">Address:</span> ${quotation.customer.address}</div>` : ''}
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
                <th style="width: 25%;">Room Details</th>
                <th style="width: 25%;">Tile Details</th>
                <th style="width: 15%; text-align: center;">Quantity</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 20%; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #999; font-style: italic;">No items found in this quotation</td></tr>'}
            </tbody>
          </table>

          <div class="total-section">
            <div style="font-size: 16px; margin-bottom: 10px;">
              <strong>Summary:</strong> ${quotationItems.length} item(s)
            </div>
            <div class="total-row">
              Total Amount: ₹${(quotation.total_cost || 0).toLocaleString('en-IN')}
            </div>
          </div>

          ${quotation.notes ? `
            <div class="notes-section">
              <div class="section-title">Additional Notes</div>
              <p style="margin: 0; font-size: 14px;">${quotation.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>Thank you for choosing Tile Solutions!</strong></p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
            <p><strong>Note:</strong> All calculations are based on square feet measurements for accuracy.</p>
            <p style="margin-top: 15px; font-style: italic;">For any queries, please contact us at your convenience.</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 1000);

      toast.success('PDF generation initiated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateQuotationPDF };
};
