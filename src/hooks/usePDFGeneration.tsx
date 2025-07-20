import { useCallback } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';
import { calculateAreaInSquareFeet, formatDimensions, formatArea } from '@/utils/unitConversions';
import { calculateTileRequirements, type TileCalculationResult } from '@/utils/tileCalculations';

export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    try {
      // Use the quotation's stored wastage percentage, defaulting to 0% if not set
      const wastagePercentage = quotation.wastage_percentage ?? 0;
      
      console.log('Starting PDF generation for quotation:', quotation.id, 'with wastage:', wastagePercentage);
      
      // Fetch quotation items using Supabase client
      const { data: quotationItems, error } = await supabase
        .from('quotation_items')
        .select(`
          *,
          room:rooms(name,length,width,unit),
          tile:tiles(name,code,price_per_box,pieces_per_box,size_length,size_breadth,image_url)
        `)
        .eq('quotation_id', quotation.id);

      console.log('DEBUG - QuotationItems for layers:', quotationItems?.filter(item => item.tile?.code === '24027'));
      
      if (error) {
        console.error('Error fetching quotation items:', error);
        throw new Error(`Failed to fetch quotation items: ${error.message}`);
      }

      console.log('Fetched quotation items for PDF:', quotationItems);

      // Group items by tile using unified calculation system
      const tileCalculations: { [tileId: string]: TileCalculationResult } = {};

      if (quotationItems && quotationItems.length > 0) {
        // Group items by tile_id and room_id to handle layers correctly
        const tileRoomGroups = new Map();
        
        quotationItems.forEach((item: any) => {
          const tileId = item.tile_id;
          const roomId = item.room_id;
          const groupKey = `${tileId}-${roomId}`;
          
          if (!tileRoomGroups.has(groupKey)) {
            tileRoomGroups.set(groupKey, {
              tile: item.tile,
              room: item.room,
              layers: [],
              baseArea: parseFloat(item.area) || 0, // Area per layer
              totalArea: 0, // Will be calculated based on layers
              customBoxes: 0,
              totalPrice: 0,
              pricePerBox: parseFloat(item.price_per_box) || 0
            });
          }
          
          const group = tileRoomGroups.get(groupKey);
          
          // Add layer if not already present
          if (!group.layers.includes(item.layer_number)) {
            group.layers.push(item.layer_number);
          }
          
          // Accumulate custom boxes and total price from each quotation item
          group.customBoxes += item.custom_boxes || 0;
          group.totalPrice += parseFloat(item.total_price) || 0;
        });

        // Calculate total area considering layers and process tiles
        tileRoomGroups.forEach((group, groupKey) => {
          const tileId = groupKey.split('-')[0];
          
          // Calculate total area: base area × number of layers
          group.totalArea = group.baseArea * group.layers.length;
          
          if (!tileCalculations[tileId]) {
            tileCalculations[tileId] = {
              tile: group.tile,
              rooms: [],
              totalArea: 0,
              rawTilesNeeded: 0,
              tilesNeeded: 0,
              fullBoxes: 0,
              leftoverTiles: 0,
              boxesNeeded: 0,
              totalPrice: 0,
              quotationItems: []
            };
          }

          // Add room with layer information
          tileCalculations[tileId].rooms.push({
            ...group.room,
            layers: group.layers.sort((a, b) => a - b),
            totalArea: group.totalArea // Area including all layers
          });
          
          // Sum up total area and price for this tile across all rooms
          tileCalculations[tileId].totalArea += group.totalArea;
          tileCalculations[tileId].totalPrice += group.totalPrice;
          
          // Store the group for custom boxes calculation
          tileCalculations[tileId].quotationItems.push({
            custom_boxes: group.customBoxes,
            total_price: group.totalPrice
          });
        });

        // Calculate tiles and boxes for display
        Object.values(tileCalculations).forEach(calc => {
          const tile = calc.tile;
          
          if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
            const tileLengthFt = (tile.size_length || 0) / 304.8;
            const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
            const tileAreaSqFt = tileLengthFt * tileBreadthFt;
            const piecesPerBox = parseInt(tile.pieces_per_box.toString());
            
            if (tileAreaSqFt > 0) {
              const basicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
              calc.rawTilesNeeded = basicTilesNeeded;
              const tilesWithWastage = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
              calc.tilesNeeded = tilesWithWastage;
              
              // Calculate box breakdown
              calc.fullBoxes = Math.floor(basicTilesNeeded / piecesPerBox);
              calc.leftoverTiles = basicTilesNeeded % piecesPerBox;
              
              // Get custom box adjustment - sum from all UNIQUE tile-room combinations
              const totalCustomBoxAdjustment = calc.quotationItems.reduce((sum, item) => {
                return sum + (item.custom_boxes || 0);
              }, 0);
              
              // Calculate base boxes needed and apply custom adjustment
              const baseBoxes = Math.ceil(tilesWithWastage / piecesPerBox);
              calc.boxesNeeded = Math.max(0, baseBoxes + totalCustomBoxAdjustment);
              
              // Use the already calculated totalPrice (includes layer adjustments)
              // calc.totalPrice is already set correctly from the grouping logic above
            }
          }
        });
      }
      
      // generate items rows, PDF content with updated wastage percentage display
      let itemsRows = '';
      let totalBoxes = 0;
      let grandTotal = 0;
      
      if (Object.keys(tileCalculations).length > 0) {
        itemsRows = Object.entries(tileCalculations).map(([tileId, calc]: [string, any]) => {
          console.log('Processing calc for PDF:', calc);
          
          const tile = calc.tile;
          
          // Calculate tile dimensions for display
          let tileDimensions = 'N/A';
          if (tile && tile.size_length && tile.size_breadth) {
            const lengthInMm = tile.size_length || 0;
            const widthInMm = tile.size_breadth || 0;
            
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

          // Get unique room names with layer information specific to this tile
          const tileQuotationItems = quotationItems?.filter((item: any) => item.tile_id === tileId) || [];
          const roomLayerMap = new Map();
          
          tileQuotationItems.forEach((item: any) => {
            const roomName = item.room?.name || 'Unknown Room';
            const layerNumber = item.layer_number || 1;
            
            if (!roomLayerMap.has(roomName)) {
              roomLayerMap.set(roomName, []);
            }
            if (!roomLayerMap.get(roomName).includes(layerNumber)) {
              roomLayerMap.get(roomName).push(layerNumber);
            }
          });

          const roomNamesWithLayers = tileCalculations[tileId].rooms.map((room: any) => {
            const layers = room.layers || [];
            const totalArea = room.totalArea || 0;
            
            let roomDisplay = room.name;
            if (layers.length > 1) {
              roomDisplay += ` (Layers: ${layers.join(', ')})`;
            } else if (layers[0] > 1) {
              roomDisplay += ` (Layer ${layers[0]})`;
            }
            
            return roomDisplay;
          }).join(', ');

          // Generate image cell content with proper aspect ratio
          const imageCell = tile?.image_url ? 
            `<img src="${tile.image_url}" alt="${tile.name || 'Tile'}" style="max-width: 80px; max-height: 60px; width: auto; height: auto; object-fit: contain;" onerror="this.style.display='none';" />` :
            '<small style="color: #999; font-style: italic;">No image</small>';
          
          const hasMultipleLayers = tileCalculations[tileId].rooms.some((room: any) => room.layers && room.layers.length > 1);
          const areaDisplay = hasMultipleLayers ? 
            `Total Area: ${formatArea(calc.totalArea)} (includes ${calc.totalArea / calc.totalArea * calc.rooms.length} layers)` : 
            `Total Area: ${formatArea(calc.totalArea)}`;
          
          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>${roomNamesWithLayers}</strong><br/>
                <small style="color: #666; font-size: 9px;">${areaDisplay}</small>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>Code: ${tile?.code || 'N/A'}</strong><br/>
                <small style="color: #666; font-size: 9px;">${tile?.name || 'Unknown Tile'}</small><br/>
                <small style="color: #666; font-size: 9px;">Size: ${tileDimensions}</small><br/>
                ${boxPricing}
              </td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; vertical-align: middle;">
                ${imageCell}
              </td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                ${calc.rawTilesNeeded || 'N/A'}<br/>
                ${calc.fullBoxes >= 0 && calc.leftoverTiles >= 0 ? 
                  `<small style="color: #666; font-size: 9px;">(${calc.fullBoxes} ${calc.fullBoxes === 1 ? 'box' : 'boxes'}${calc.leftoverTiles > 0 ? ` and ${calc.leftoverTiles} ${calc.leftoverTiles === 1 ? 'tile' : 'tiles'}` : ''})</small><br/>` : 
                  ''
                }
                <small style="color: #666; font-size: 9px;">+${wastagePercentage}% wastage</small>
              </td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">${calc.boxesNeeded || 'N/A'}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${tile?.price_per_box ? parseFloat(tile.price_per_box).toLocaleString('en-IN') : 'N/A'}</td>
              <td style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${calc.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('');
      } else {
        itemsRows = '<tr><td colspan="7" class="no-items">No items found in this quotation</td></tr>';
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
              ${(() => {
                const customer = quotation.customer as any;
                const addressParts = [];
                
                if (customer?.address) addressParts.push(customer.address);
                if (customer?.area) addressParts.push(customer.area);
                if (customer?.state) addressParts.push(customer.state);
                
                return addressParts.length > 0 ? 
                  `<div class="info-row"><span class="label">Address:</span> ${addressParts.join(', ')}</div>` : 
                  '';
              })()}
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
                <th style="width: 20%;">Room(s) & Area</th>
                <th style="width: 20%;">Tile Details</th>
                <th style="width: 10%; text-align: center;">Image</th>
                <th style="width: 15%; text-align: center;">Tiles Required</th>
                <th style="width: 12%; text-align: center;">Boxes</th>
                <th style="width: 10%; text-align: center;">Price/Box</th>
                <th style="width: 13%; text-align: right;">Total Amount</th>
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

      const element = document.createElement('div');
      element.innerHTML = pdfContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px'; // Off-screen
      document.body.appendChild(element);
      
      // Use html2canvas and jsPDF for better Vite compatibility
      const canvas = await html2canvas(element, { 
        scale: 1.5, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // A4 dimensions with padding
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10; // 10mm margin on all sides
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      // Calculate proper scaling to fit content with margins
      const imgAspectRatio = canvas.width / canvas.height;
      const contentAspectRatio = contentWidth / contentHeight;
      
      let finalWidth, finalHeight;
      
      if (imgAspectRatio > contentAspectRatio) {
        // Image is wider, fit to width
        finalWidth = contentWidth;
        finalHeight = contentWidth / imgAspectRatio;
      } else {
        // Image is taller, fit to height
        finalHeight = contentHeight;
        finalWidth = contentHeight * imgAspectRatio;
      }
      
      // Center the content
      const xOffset = margin + (contentWidth - finalWidth) / 2;
      const yOffset = margin;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`Quotation-${quotation.quotation_number}.pdf`);
      
      document.body.removeChild(element);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateQuotationPDF };
};