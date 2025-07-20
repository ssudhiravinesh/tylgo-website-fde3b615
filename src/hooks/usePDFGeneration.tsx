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
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;">
                <strong>${roomNamesWithLayers}</strong><br/>
                <small style="color: #666; font-size: 11px;">${areaDisplay}</small>
              </td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;">
                <strong>Code: ${tile?.code || 'N/A'}</strong><br/>
                <small style="color: #666; font-size: 11px;">${tile?.name || 'Unknown Tile'}</small><br/>
                <small style="color: #666; font-size: 11px;">Size: ${tileDimensions}</small><br/>
                ${boxPricing.replace('font-size: 9px', 'font-size: 10px')}
              </td>
              <td style="text-align: center; padding: 10px 8px; border: 1px solid #ddd; vertical-align: middle;">
                ${imageCell}
              </td>
              <td style="text-align: center; padding: 10px 8px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;">
                ${calc.rawTilesNeeded || 'N/A'}<br/>
                ${calc.fullBoxes >= 0 && calc.leftoverTiles >= 0 ? 
                  `<small style="color: #666; font-size: 11px;">(${calc.fullBoxes} ${calc.fullBoxes === 1 ? 'box' : 'boxes'}${calc.leftoverTiles > 0 ? ` and ${calc.leftoverTiles} ${calc.leftoverTiles === 1 ? 'tile' : 'tiles'}` : ''})</small><br/>` : 
                  ''
                }
                <small style="color: #666; font-size: 11px;">+${wastagePercentage}% wastage</small>
              </td>
              <td style="text-align: right; padding: 10px 8px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;">${calc.boxesNeeded || 'N/A'}</td>
              <td style="text-align: center; padding: 10px 8px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;">₹${tile?.price_per_box ? parseFloat(tile.price_per_box).toLocaleString('en-IN') : 'N/A'}</td>
              <td style="text-align: right; font-weight: bold; padding: 10px 8px; border: 1px solid #ddd; font-size: 13px; vertical-align: top;">₹${calc.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('');
      } else {
        itemsRows = '<tr><td colspan="7" class="no-items">No items found in this quotation</td></tr>';
      }

      export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    try {
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

      if (error) {
        console.error('Error fetching quotation items:', error);
        throw new Error(`Failed to fetch quotation items: ${error.message}`);
      }

      // Your existing tile calculations logic here (keep as is)
      const tileCalculations: { [tileId: string]: TileCalculationResult } = {};
      // ... (keep all your existing tile calculation logic)

      // Generate items rows and totals (keep your existing logic)
      let itemsRows = '';
      let totalBoxes = 0;
      let grandTotal = 0;
      
      // ... (keep your existing items rows generation logic)

      // **IMPROVED PDF GENERATION STARTS HERE**
      
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotation ${quotation.quotation_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              color: #333; 
              font-size: 14px;
              line-height: 1.4;
              background: white;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              border-bottom: 2px solid #007bff; 
              padding-bottom: 15px; 
            }
            .company-name { 
              font-size: 36px; 
              font-weight: bold; 
              color: #007bff; 
              margin-bottom: 8px; 
            }
            .orange-g {
              color: #ff8c00;
            }
            .quotation-title { 
              font-size: 20px; 
              color: #555; 
              margin-bottom: 10px; 
            }
            .details { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 20px; 
            }
            .customer-info, .quotation-info { 
              width: 48%; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 10px; 
              color: #007bff; 
              border-bottom: 1px solid #ddd; 
              padding-bottom: 4px; 
            }
            .info-row { 
              margin-bottom: 6px; 
              font-size: 12px; 
            }
            .label { 
              font-weight: bold; 
              color: #555; 
              width: 90px; 
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
              font-size: 14px; 
              font-weight: bold; 
              color: #007bff; 
              padding: 6px 0; 
              border-top: 2px solid #007bff; 
              margin-top: 4px; 
            }
            .footer { 
              margin-top: 20px; 
              text-align: center; 
              color: #666; 
              font-size: 8px; 
              border-top: 1px solid #ddd; 
              padding-top: 8px; 
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
          <div class="header">
            <div class="company-name">TYL<span class="orange-g">G</span>O</div>
            <div class="quotation-title">QUOTATION</div>
          </div>
          
          <div class="details">
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
                if (customer?.pincode) addressParts.push(customer.pincode);
                
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
                <th style="width: 22%;">Room(s) & Area</th>
                <th style="width: 22%;">Tile Details</th>
                <th style="width: 8%; text-align: center;">Image</th>
                <th style="width: 16%; text-align: center;">Tiles Required</th>
                <th style="width: 10%; text-align: center;">Boxes</th>
                <th style="width: 10%; text-align: center;">Price/Box</th>
                <th style="width: 12%; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="total-section">
            <div style="font-size: 10px; margin-bottom: 4px;">
              <strong>Summary:</strong> ${Object.keys(tileCalculations).length} tile type(s) | ${totalBoxes} boxes total
            </div>
            <div class="total-row">
              Total Amount: ₹${grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : (quotation.total_cost || 0).toLocaleString('en-IN')}
            </div>
          </div>

          ${quotation.notes ? `
            <div style="margin-top: 15px; padding: 8px; background-color: #fff9c4; border-left: 3px solid #ffc107; border-radius: 3px;">
              <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #007bff;">Additional Notes</div>
              <p style="margin: 0; font-size: 10px;">${quotation.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>Thank you for choosing TYLGO!</strong></p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
            <p><strong>Note:</strong> All tile quantities include a ${wastagePercentage}% wastage allowance.</p>
            <p>All calculations are based on square feet measurements for accuracy.</p>
          </div>
        </body>
        </html>
      `;

      // Create off-screen element with fixed dimensions
      const element = document.createElement('div');
      element.innerHTML = pdfContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.width = '794px'; // Fixed width for A4 at 96 DPI
      element.style.backgroundColor = 'white';
      document.body.appendChild(element);
      
      // **IMPROVED HTML2CANVAS CONFIGURATION**
      const canvas = await html2canvas(element, { 
        scale: 1, // Use scale 1 for consistent rendering
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // Fixed width
        height: element.scrollHeight, // Let height adjust to content
        windowWidth: 794, // Important: set window width
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          // Set viewport properties on cloned document
          const clonedElement = clonedDoc.querySelector('div');
          if (clonedElement) {
            clonedElement.style.width = '794px';
            clonedElement.style.fontSize = '14px';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // **IMPROVED MULTI-PAGE HANDLING**
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // 10mm margin
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      // Convert canvas dimensions to mm (96 DPI = 3.78 pixels per mm)
      const canvasWidthMm = canvas.width / 3.78;
      const canvasHeightMm = canvas.height / 3.78;
      
      // Calculate how many pages we need
      const totalPages = Math.ceil(canvasHeightMm / contentHeight);
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculate the portion of the image for this page
        const sourceY = i * contentHeight * 3.78; // Convert back to pixels
        const sourceHeight = Math.min(contentHeight * 3.78, canvas.height - sourceY);
        
        // Create a canvas for this page
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        // Draw the portion of the original canvas
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight, // Source rectangle
          0, 0, canvas.width, sourceHeight        // Destination rectangle
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        
        // Add image to PDF page with proper scaling
        const imgWidth = contentWidth;
        const imgHeight = (sourceHeight / 3.78);
        
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, imgHeight);
      }
      
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
