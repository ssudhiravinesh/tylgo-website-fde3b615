import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Quotation } from '@/hooks/useQuotations';
import { calculateAreaInSquareFeet, formatDimensions, formatArea } from '@/utils/unitConversions';

export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    try {
      // Fetch quotation items with proper joins
      const response = await fetch(`https://onucizagpgwdpcakskat.supabase.co/rest/v1/quotation_items?quotation_id=eq.${quotation.id}&select=*,room:rooms(name,length,width,unit),tile:tiles(name,code,price_per_sqm,price_per_box,pieces_per_box,size_length,size_breadth)`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWNpemFncGd3ZHBjYWtza2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODA0NDUsImV4cCI6MjA2NjE1NjQ0NX0.c7Ihw4a38Xa37ygQyF1sjiApLsayTQLvs5QvPtsIozM',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWNpemFncGd3ZHBjYWtza2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODA0NDUsImV4cCI6MjA2NjE1NjQ0NX0.c7Ihw4a38Xa37ygQyF1sjiApLsayTQLvs5QvPtsIozM',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quotation items: ${response.statusText}`);
      }

      const quotationItems = await response.json();
      console.log('Fetched quotation items:', quotationItems);

      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Generate items rows for the table - Fixed logic
      let itemsRows = '';
      
      if (quotationItems && quotationItems.length > 0) {
        itemsRows = quotationItems.map((item: any) => {
          console.log('Processing item:', item); // Debug log
          
          const room = item.room;
          const tile = item.tile;
          
          // Calculate area in square feet if room dimensions are available
          let roomDetails = 'N/A';
          let areaInSqFt = 'N/A';
          
          if (room && room.length && room.width && room.unit) {
            try {
              const areaSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
              roomDetails = formatDimensions(room.length, room.width, room.unit);
              areaInSqFt = formatArea(areaSqFt);
            } catch (error) {
              console.error('Error calculating area:', error);
            }
          }

          // Calculate tile dimensions for display
          let tileDimensions = 'N/A';
          if (tile && tile.size_length && tile.size_breadth) {
            const lengthInMm = parseFloat(tile.size_length) || 0;
            const widthInMm = parseFloat(tile.size_breadth) || 0;
            
            if (lengthInMm >= 1000 || widthInMm >= 1000) {
              const lengthInM = (lengthInMm / 1000).toFixed(2);
              const widthInM = (widthInMm / 1000).toFixed(2);
              tileDimensions = `${lengthInM} × ${widthInM} m`;
            } else if (lengthInMm >= 100 || widthInMm >= 100) {
              const lengthInCm = (lengthInMm / 10).toFixed(1);
              const widthInCm = (widthInMm / 10).toFixed(1);
              tileDimensions = `${lengthInCm} × ${widthInCm} cm`;
            } else {
              tileDimensions = `${lengthInMm} × ${widthInMm} mm`;
            }
          }

          // Ensure numeric values are properly handled
          const quantity = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const totalPrice = parseFloat(item.total_price) || (quantity * unitPrice);

          // Format box pricing information
          let boxPricing = '';
          if (tile && tile.price_per_box && tile.pieces_per_box) {
            boxPricing = `<small style="color: #666; font-size: 9px;">Box: ₹${parseFloat(tile.price_per_box).toLocaleString('en-IN')} (${tile.pieces_per_box} pcs)</small><br/>`;
          }

          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>${room?.name || 'Unknown Room'}</strong><br/>
                <small style="color: #666; font-size: 9px;">Dim: ${roomDetails}</small><br/>
                <small style="color: #666; font-size: 9px;">Area: ${areaInSqFt}</small>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>${tile?.name || 'Unknown Tile'}</strong><br/>
                <small style="color: #666; font-size: 9px;">Code: ${tile?.code || 'N/A'}</small><br/>
                <small style="color: #666; font-size: 9px;">Size: ${tileDimensions}</small><br/>
                ${boxPricing}
              </td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">${quantity.toFixed(2)} sq ft</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('');
      } else {
        itemsRows = '<tr><td colspan="5" class="no-items">No items found in this quotation</td></tr>';
      }

      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotation ${quotation.quotation_number}</title>
          <style>
            @media print {
              @page { 
                margin: 10mm; 
                size: A4; 
              }
              body { 
                margin: 0; 
                font-size: 12px;
                line-height: 1.2;
              }
              .no-page-break { 
                page-break-inside: avoid; 
              }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 15px; 
              color: #333; 
              font-size: 12px;
              line-height: 1.3;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #007bff; 
              padding-bottom: 10px; 
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              color: #007bff; 
              margin-bottom: 5px; 
            }
            .quotation-title { 
              font-size: 18px; 
              color: #555; 
              margin-bottom: 10px; 
            }
            .details { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 20px; 
            }
            .customer-info, .quotation-info { 
              width: 45%; 
            }
            .section-title { 
              font-size: 14px; 
              font-weight: bold; 
              margin-bottom: 8px; 
              color: #007bff; 
              border-bottom: 1px solid #ddd; 
              padding-bottom: 4px; 
            }
            .info-row { 
              margin-bottom: 6px; 
              font-size: 11px; 
            }
            .label { 
              font-weight: bold; 
              color: #555; 
              width: 80px; 
              display: inline-block; 
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
              font-size: 11px;
            }
            .items-table th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
              padding: 8px 6px; 
              border: 1px solid #ddd; 
              text-align: left; 
              font-size: 10px;
            }
            .items-table td { 
              border: 1px solid #ddd; 
              padding: 8px 6px; 
              vertical-align: top; 
              font-size: 11px;
            }
            .items-table tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .total-section { 
              text-align: right; 
              margin-top: 15px; 
              padding: 10px; 
              background-color: #f8f9fa; 
              border-radius: 4px; 
            }
            .total-row { 
              font-size: 16px; 
              font-weight: bold; 
              color: #007bff; 
              padding: 8px 0; 
              border-top: 2px solid #007bff; 
              margin-top: 5px; 
            }
            .notes-section { 
              margin-top: 15px; 
              padding: 10px; 
              background-color: #fff9c4; 
              border-left: 3px solid #ffc107; 
              border-radius: 3px; 
            }
            .notes-section .section-title {
              font-size: 12px;
              margin-bottom: 5px;
            }
            .footer { 
              margin-top: 20px; 
              text-align: center; 
              color: #666; 
              font-size: 9px; 
              border-top: 1px solid #ddd; 
              padding-top: 10px; 
            }
            .footer p { 
              margin: 4px 0; 
            }
            .no-items {
              text-align: center; 
              padding: 20px; 
              color: #999; 
              font-style: italic;
              font-size: 11px;
            }

          </style>
        </head>
        <body>
          <!-- Enhanced logging for debugging -->
          <script>
            console.log('PDF Generation Debug:');
            console.log('Items Count:', ${quotationItems ? quotationItems.length : 0});
            console.log('Items Data:', ${JSON.stringify(quotationItems, null, 2)});
          </script>

          <div class="header no-page-break">
            <div class="company-name">Tile Solutions</div>
            <div class="quotation-title">QUOTATION</div>
          </div>
          
          <div class="details no-page-break">
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
              ${itemsRows}
            </tbody>
          </table>

          <div class="total-section no-page-break">
            <div style="font-size: 11px; margin-bottom: 5px;">
              <strong>Summary:</strong> ${quotationItems ? quotationItems.length : 0} item(s)
            </div>
            <div class="total-row">
              Total Amount: ₹${(quotation.total_cost || 0).toLocaleString('en-IN')}
            </div>
          </div>

          ${quotation.notes ? `
            <div class="notes-section no-page-break">
              <div class="section-title">Additional Notes</div>
              <p style="margin: 0; font-size: 11px;">${quotation.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>Thank you for choosing Tile Solutions!</strong></p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
            <p><strong>Note:</strong> All calculations are based on square feet measurements for accuracy.</p>
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
