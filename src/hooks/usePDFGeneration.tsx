
import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';
import { calculateAreaInSquareFeet, formatDimensions, formatArea } from '@/utils/unitConversions';
import { calculateTileRequirements, type TileCalculationResult } from '@/utils/tileCalculations';

export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    try {
      // Use the quotation's stored wastage percentage, defaulting to 10% if not set
      const wastagePercentage = quotation.wastage_percentage ?? 10;
      
      console.log('Starting PDF generation for quotation:', quotation.id, 'with wastage:', wastagePercentage);
      
      // Fetch quotation items using Supabase client
      const { data: quotationItems, error } = await supabase
        .from('quotation_items')
        .select(`
          *,
          room:rooms(name,length,width,unit),
          tile:tiles(name,code,price_per_box,pieces_per_box,size_length,size_breadth)
        `)
        .eq('quotation_id', quotation.id);

      if (error) {
        console.error('Error fetching quotation items:', error);
        throw new Error(`Failed to fetch quotation items: ${error.message}`);
      }

      console.log('Fetched quotation items for PDF:', quotationItems);

      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Group items by tile using unified calculation system
      const tileCalculations: { [tileId: string]: TileCalculationResult } = {};

      if (quotationItems && quotationItems.length > 0) {
        quotationItems.forEach((item: any) => {
          const tileId = item.tile_id;
          const room = item.room;
          const tile = item.tile;
          
          if (!tileCalculations[tileId]) {
            tileCalculations[tileId] = {
              tile,
              rooms: [],
              totalArea: 0,
              tilesNeeded: 0,
              boxesNeeded: 0,
              totalPrice: 0
            };
          }

          const roomAreaInSqFt = parseFloat(item.area) || 0;
          tileCalculations[tileId].rooms.push(room);
          tileCalculations[tileId].totalArea += roomAreaInSqFt;
          tileCalculations[tileId].totalPrice += parseFloat(item.total_price) || 0;
        });

        // Calculate tiles and boxes for display
        Object.values(tileCalculations).forEach(calc => {
          const tile = calc.tile;
          
          if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
            const tileLengthFt = (parseFloat(tile.size_length) || 0) / 304.8;
            const tileBreadthFt = (parseFloat(tile.size_breadth) || 0) / 304.8;
            const tileAreaSqFt = tileLengthFt * tileBreadthFt;
            
            if (tileAreaSqFt > 0) {
              const basicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
              calc.tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
              calc.boxesNeeded = Math.ceil(calc.tilesNeeded / tile.pieces_per_box);
            }
          }
        });
      }

      // generate items rows, PDF content with updated wastage percentage display
      let itemsRows = '';
      let totalBoxes = 0;
      let grandTotal = 0;
      
      if (Object.keys(tileCalculations).length > 0) {
        itemsRows = Object.values(tileCalculations).map((calc: any) => {
          console.log('Processing calc for PDF:', calc);
          
          const tile = calc.tile;
          const rooms = calc.rooms;
          
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

          totalBoxes += calc.boxesNeeded;
          grandTotal += calc.totalPrice;

          const boxPricing = tile?.price_per_box ? 
            `<small style="color: #666; font-size: 9px;">₹${parseFloat(tile.price_per_box).toLocaleString('en-IN')} per box (${tile.pieces_per_box} pcs)</small><br/>` : '';

          const roomNames = rooms.map(r => r?.name || 'Unknown Room').join(', ');

          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>${roomNames}</strong><br/>
                <small style="color: #666; font-size: 9px;">Total Area: ${formatArea(calc.totalArea)}</small>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>${tile?.name || 'Unknown Tile'}</strong><br/>
                <small style="color: #666; font-size: 9px;">Code: ${tile?.code || 'N/A'}</small><br/>
                <small style="color: #666; font-size: 9px;">Size: ${tileDimensions}</small><br/>
                ${boxPricing}
              </td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                ${calc.tilesNeeded || 'N/A'}<br/>
                <small style="color: #666; font-size: 9px;">+${wastagePercentage}% wastage</small>
              </td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">${calc.boxesNeeded || 'N/A'}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${tile?.price_per_box ? parseFloat(tile.price_per_box).toLocaleString('en-IN') : 'N/A'}</td>
              <td style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${calc.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('');
      } else {
        itemsRows = '<tr><td colspan="6" class="no-items">No items found in this quotation</td></tr>';
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
              font-size: 10px;
            }
            .items-table th { 
              background-color: #f8f9fa; 
              font-weight: bold; 
              padding: 6px 4px; 
              border: 1px solid #ddd; 
              text-align: left; 
              font-size: 9px;
            }
            .items-table td { 
              border: 1px solid #ddd; 
              padding: 6px 4px; 
              vertical-align: top; 
              font-size: 10px;
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
            .footer { 
              margin-top: 20px; 
              text-align: center; 
              color: #666; 
              font-size: 9px; 
              border-top: 1px solid #ddd; 
              padding-top: 10px; 
            }
            .no-items {
              text-align: center; 
              padding: 20px; 
              color: #999; 
              font-style: italic;
            }
          </style>
        </head>
        <body>
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
              <div class="info-row"><span class="label">Wastage:</span> ${wastagePercentage}%</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25%;">Room(s) & Area</th>
                <th style="width: 25%;">Tile Details</th>
                <th style="width: 15%; text-align: center;">Tiles Required</th>
                <th style="width: 15%; text-align: center;">Boxes</th>
                <th style="width: 10%; text-align: center;">Price/Box</th>
                <th style="width: 15%; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="total-section no-page-break">
            <div style="font-size: 11px; margin-bottom: 5px;">
              <strong>Summary:</strong> ${Object.keys(tileCalculations).length} tile type(s) | ${totalBoxes} boxes total
            </div>
            <div class="total-row">
              Total Amount: ₹${grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : (quotation.total_cost || 0).toLocaleString('en-IN')}
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
            <p><strong>Note:</strong> All tile quantities include a ${wastagePercentage}% wastage allowance.</p>
            <p>All calculations are based on square feet measurements for accuracy.</p>
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

      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateQuotationPDF };
};
