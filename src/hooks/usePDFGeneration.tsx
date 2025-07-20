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

      if (error) {
        console.error('Error fetching quotation items:', error);
        throw new Error(`Failed to fetch quotation items: ${error.message}`);
      }

      console.log('Fetched quotation items for PDF:', quotationItems);

      // Create a properly positioned container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.height = 'auto';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.zIndex = '-1000';
      tempContainer.style.overflow = 'visible';
      document.body.appendChild(tempContainer);

      // Group items by tile and room, handling layers
      const processedItems = new Map();
      let totalBoxes = 0;
      let grandTotal = 0;

      if (quotationItems && quotationItems.length > 0) {
        quotationItems.forEach((item: any) => {
          const key = `${item.tile_id}-${item.room_id}`;
          
          if (!processedItems.has(key)) {
            processedItems.set(key, {
              room: item.room,
              tile: item.tile,
              layers: [],
              area: parseFloat(item.area) || 0,
              totalPrice: 0,
              boxes: 0,
              tilesRequired: 0,
              pricePerBox: parseFloat(item.price_per_box) || parseFloat(item.tile?.price_per_box) || 0
            });
          }
          
          const processedItem = processedItems.get(key);
          if (!processedItem.layers.includes(item.layer_number)) {
            processedItem.layers.push(item.layer_number);
          }
          
          processedItem.totalPrice += parseFloat(item.total_price) || 0;
          processedItem.boxes += item.custom_boxes || 0;
        });

        // Calculate tiles required for each item
        processedItems.forEach((item) => {
          const tile = item.tile;
          if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box) {
            const tileLengthFt = (tile.size_length || 0) / 304.8;
            const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
            const tileAreaSqFt = tileLengthFt * tileBreadthFt;
            
            if (tileAreaSqFt > 0) {
              // Calculate area considering layers
              const totalArea = item.area * item.layers.length;
              const basicTilesNeeded = Math.ceil(totalArea / tileAreaSqFt);
              item.tilesRequired = Math.ceil(basicTilesNeeded * (1 + (wastagePercentage / 100)));
              
              // Calculate boxes if not already set
              if (item.boxes === 0) {
                item.boxes = Math.ceil(item.tilesRequired / tile.pieces_per_box);
              }
              
              // Recalculate total price if needed
              if (item.totalPrice === 0) {
                item.totalPrice = item.boxes * item.pricePerBox;
              }
            }
          }
          
          totalBoxes += item.boxes;
          grandTotal += item.totalPrice;
        });
      }

      // Generate items rows with clean format matching the image
      let itemsRows = '';
      
      if (processedItems.size > 0) {
        itemsRows = Array.from(processedItems.values()).map((item: any) => {
          const tile = item.tile;
          const room = item.room;
          
          // Format room name with layers
          let roomDisplay = room?.name || 'Unknown Room';
          if (item.layers.length > 1) {
            roomDisplay += ` (Layers: ${item.layers.sort((a, b) => a - b).join(', ')})`;
          } else if (item.layers[0] > 1) {
            roomDisplay += ` (Layer ${item.layers[0]})`;
          }
          
          // Calculate tile dimensions for display
          let tileDimensions = 'N/A';
          if (tile && tile.size_length && tile.size_breadth) {
            const lengthInMm = tile.size_length || 0;
            const widthInMm = tile.size_breadth || 0;
            
            if (lengthInMm >= 1000 || widthInMm >= 1000) {
              const lengthInM = (lengthInMm / 1000).toFixed(1);
              const widthInM = (widthInMm / 1000).toFixed(1);
              tileDimensions = `${lengthInM} × ${widthInM} m`;
            } else if (lengthInMm >= 100 || widthInMm >= 100) {
              const lengthInCm = (lengthInMm / 10).toFixed(0);
              const widthInCm = (widthInMm / 10).toFixed(0);
              tileDimensions = `${lengthInCm} × ${widthInCm} cm`;
            } else {
              tileDimensions = `${lengthInMm} × ${widthInMm} mm`;
            }
          }

          // Format area display
          const totalArea = item.area * item.layers.length;
          const areaDisplay = `Total Area: ${totalArea.toFixed(2)} sq ft`;
          if (item.layers.length > 1) {
            const baseAreaText = `(${item.area.toFixed(2)} sq ft × ${item.layers.length} layer${item.layers.length > 1 ? 's' : ''})`;
            roomDisplay += `\n${areaDisplay} ${baseAreaText}`;
          } else {
            roomDisplay += `\n${areaDisplay}`;
          }

          // Generate image cell content with proper aspect ratio
          let imageCell = '<div style="width: 50px; height: 40px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999;">No Image</div>';
          if (tile?.image_url) {
            // Calculate proper dimensions based on tile aspect ratio
            let imageWidth = 50;
            let imageHeight = 40;
            
            if (tile.size_length && tile.size_breadth) {
              const tileAspectRatio = tile.size_length / tile.size_breadth;
              const containerAspectRatio = 50 / 40; // 1.25
              
              if (tileAspectRatio > containerAspectRatio) {
                // Tile is wider than container - fit to width
                imageWidth = 50;
                imageHeight = Math.round(50 / tileAspectRatio);
              } else {
                // Tile is taller than container - fit to height
                imageHeight = 40;
                imageWidth = Math.round(40 * tileAspectRatio);
              }
            }
            
            imageCell = `
              <div style="width: 50px; height: 40px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                <img 
                  src="${tile.image_url}" 
                  alt="${tile.name || 'Tile'}" 
                  style="width: ${imageWidth}px; height: ${imageHeight}px; object-fit: cover; border-radius: 3px;" 
                  onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\'font-size: 8px; color: #999; text-align: center;\\'>No Image</div>';" 
                />
              </div>
            `;
          }

          return `
            <tr style="border-bottom: 1px solid #e5e5e5; page-break-inside: avoid;">
              <td style="padding: 8px; font-size: 10px; vertical-align: top; border-right: 1px solid #e5e5e5; white-space: pre-line;">
                <strong style="color: #333; font-size: 10px;">${roomDisplay}</strong>
              </td>
              <td style="padding: 8px; font-size: 10px; vertical-align: top; border-right: 1px solid #e5e5e5;">
                <div style="margin-bottom: 2px;"><strong>Code: ${tile?.code || 'N/A'}</strong></div>
                <div style="font-size: 9px; color: #666; margin-bottom: 2px;">${tile?.name || 'Unknown Tile'}</div>
                <div style="font-size: 9px; color: #666; margin-bottom: 2px;">Size: ${tileDimensions}</div>
                <div style="font-size: 9px; color: #666;">₹${item.pricePerBox.toLocaleString('en-IN')} per box (${tile?.pieces_per_box || 'N/A'} pcs)</div>
              </td>
              <td style="text-align: center; padding: 8px; vertical-align: middle; border-right: 1px solid #e5e5e5;">
                ${imageCell}
              </td>
              <td style="text-align: center; padding: 8px; font-size: 10px; vertical-align: middle; border-right: 1px solid #e5e5e5;">
                <strong>${item.tilesRequired}</strong>
                ${wastagePercentage > 0 ? `<div style="font-size: 8px; color: #666;">+${wastagePercentage}% wastage</div>` : ''}
              </td>
              <td style="text-align: center; padding: 8px; font-size: 10px; vertical-align: middle; border-right: 1px solid #e5e5e5; font-weight: bold;">
                ${item.boxes}
              </td>
              <td style="text-align: center; padding: 8px; font-size: 10px; vertical-align: middle; border-right: 1px solid #e5e5e5;">
                ₹${item.pricePerBox.toLocaleString('en-IN')}
              </td>
              <td style="text-align: right; padding: 8px; font-size: 10px; vertical-align: middle; font-weight: bold;">
                ₹${item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          `;
        }).join('');
      } else {
        itemsRows = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999; font-style: italic;">No items found in this quotation</td></tr>';
      }

      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotation ${quotation.quotation_number}</title>
          <style>
            @media print {
              @page { 
                margin: 15mm; 
                size: A4; 
              }
              body { 
                margin: 0; 
                font-size: 11px;
              }
            }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 0; 
              padding: 25px;
              color: #333; 
              font-size: 11px;
              background: white;
              line-height: 1.3;
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
              border-bottom: 2px solid #2196F3; 
              padding-bottom: 10px; 
            }
            .company-name { 
              font-size: 20px; 
              font-weight: bold; 
              color: #2196F3; 
              margin-bottom: 3px; 
            }
            .quotation-title { 
              font-size: 14px; 
              color: #666; 
              margin: 0;
              font-weight: normal;
            }
            .details-section { 
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
            }
            .customer-details, .quotation-details {
              width: 48%;
            }
            .section-title { 
              font-size: 12px; 
              font-weight: bold; 
              margin-bottom: 8px; 
              color: #2196F3; 
              border-bottom: 1px solid #e5e5e5;
              padding-bottom: 3px;
            }
            .info-row { 
              margin-bottom: 4px; 
              font-size: 10px; 
              display: flex;
            }
            .label { 
              font-weight: bold; 
              color: #555; 
              width: 70px;
              flex-shrink: 0;
            }
            .value {
              color: #333;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0; 
              font-size: 9px;
              border: 1px solid #ddd;
            }
            .items-table th { 
              background: #2196F3; 
              color: white;
              font-weight: bold; 
              padding: 8px 6px; 
              text-align: left; 
              font-size: 9px;
              border-right: 1px solid rgba(255,255,255,0.2);
            }
            .items-table th:nth-child(3),
            .items-table th:nth-child(4),
            .items-table th:nth-child(5),
            .items-table th:nth-child(6) { 
              text-align: center; 
            }
            .items-table th:nth-child(7) { 
              text-align: right; 
            }
            .items-table tr:nth-child(even) { 
              background-color: #f8f9fa; 
            }
            .items-table tr:hover {
              background-color: #f0f8ff;
            }
            .total-section { 
              margin-top: 15px; 
              text-align: right;
              background: #f8f9fa;
              padding: 12px;
              border-radius: 5px;
              border: 1px solid #e5e5e5;
            }
            .summary-text {
              font-size: 10px;
              margin-bottom: 8px;
              color: #666;
            }
            .total-amount { 
              font-size: 14px; 
              font-weight: bold; 
              color: #2196F3; 
            }
            .footer { 
              margin-top: 20px; 
              text-align: center; 
              color: #666; 
              font-size: 9px; 
              border-top: 1px solid #e5e5e5; 
              padding-top: 10px; 
            }
            .footer p {
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">TYL<span style="color: #FF9800;">G</span>O</div>
            <div class="quotation-title">QUOTATION</div>
          </div>
          
          <div class="details-section">
            <div class="customer-details">
              <div class="section-title">Customer Details</div>
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${quotation.customer?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Mobile:</span>
                <span class="value">${quotation.customer?.mobile || 'N/A'}</span>
              </div>
              ${quotation.customer?.address ? `
                <div class="info-row">
                  <span class="label">Address:</span>
                  <span class="value">${quotation.customer.address}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="quotation-details">
              <div class="section-title">Quotation Details</div>
              <div class="info-row">
                <span class="label">Quotation #:</span>
                <span class="value">${quotation.quotation_number}</span>
              </div>
              <div class="info-row">
                <span class="label">Date:</span>
                <span class="value">${new Date(quotation.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span>
                <span class="value">${quotation.status.toUpperCase()}</span>
              </div>
              <div class="info-row">
                <span class="label">Created by:</span>
                <span class="value">${quotation.worker?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Wastage:</span>
                <span class="value">${wastagePercentage}%</span>
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 22%;">Room(s) & Area</th>
                <th style="width: 26%;">Tile Details</th>
                <th style="width: 8%; text-align: center;">Image</th>
                <th style="width: 12%; text-align: center;">Tiles Required</th>
                <th style="width: 8%; text-align: center;">Boxes</th>
                <th style="width: 12%; text-align: center;">Price/Box</th>
                <th style="width: 12%; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="total-section">
            <div class="summary-text">
              Summary: ${processedItems.size} item(s) | ${totalBoxes} boxes total
            </div>
            <div class="total-amount">
              Total Amount: ₹${grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : (quotation.total_cost || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div class="footer">
            <p><strong>Thank you for choosing TYLGO!</strong></p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
            ${wastagePercentage > 0 ? `<p>All tile quantities include a ${wastagePercentage}% wastage allowance.</p>` : ''}
            <p>All calculations are based on square feet measurements for accuracy.</p>
          </div>
        </body>
        </html>
      `;

      // Set the HTML content to the temp container
      tempContainer.innerHTML = pdfContent;
      
      // Wait for images to load and content to render
      const images = tempContainer.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete || img.naturalWidth > 0) {
            resolve(true);
          } else {
            const handleLoad = () => {
              img.removeEventListener('load', handleLoad);
              img.removeEventListener('error', handleError);
              resolve(true);
            };
            
            const handleError = () => {
              img.removeEventListener('load', handleLoad);
              img.removeEventListener('error', handleError);
              // Execute the error handler in the onerror attribute
              if (img.onerror) {
                try {
                  const errorHandler = new Function('event', img.getAttribute('onerror'));
                  errorHandler.call(img);
                } catch (e) {
                  console.warn('Error executing image error handler:', e);
                }
              }
              resolve(true);
            };
            
            img.addEventListener('load', handleLoad);
            img.addEventListener('error', handleError);
            
            // Fallback timeout
            setTimeout(() => {
              img.removeEventListener('load', handleLoad);
              img.removeEventListener('error', handleError);
              resolve(true);
            }, 8000);
          }
        });
      });

      // Wait for all images to load before generating PDF
      await Promise.all(imagePromises);
      
      // Add a small delay to ensure all rendering is complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        console.log('Starting PDF canvas generation...');
        
        // Convert HTML to canvas with optimized settings
        const canvas = await html2canvas(tempContainer, {
          scale: 2, // High quality
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          width: tempContainer.scrollWidth,
          height: tempContainer.scrollHeight,
          logging: false,
          imageTimeout: 15000,
          removeContainer: false,
          foreignObjectRendering: false,
          onclone: (clonedDoc, element) => {
            // Ensure styles are applied in cloned document
            const clonedContainer = element;
            if (clonedContainer) {
              clonedContainer.style.position = 'static';
              clonedContainer.style.left = 'auto';
              clonedContainer.style.visibility = 'visible';
              clonedContainer.style.transform = 'none';
            }
            
            // Ensure all images in cloned document are properly handled
            const clonedImages = clonedDoc.querySelectorAll('img');
            clonedImages.forEach(img => {
              img.style.maxWidth = 'none';
              img.style.maxHeight = 'none';
            });
          }
        });

        console.log('Canvas generated, creating PDF...');

        // Create PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgData = canvas.toDataURL('image/png', 0.95);
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pageHeight;

        // Add additional pages if content is longer than one page
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
          heightLeft -= pageHeight;
        }

        // Download the PDF
        pdf.save(`Quotation_${quotation.quotation_number}.pdf`);
        
        console.log('PDF downloaded successfully');
        toast.success('PDF downloaded successfully');
        
      } catch (pdfError) {
        console.error('Error converting to PDF:', pdfError);
        toast.error('Failed to generate PDF. Please try again.');
      } finally {
        // Clean up
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateQuotationPDF };
};