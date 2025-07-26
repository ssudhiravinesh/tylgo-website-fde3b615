import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  image_url?: string | null;
}

export const useUnifiedPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to convert image URL to base64 by fetching from Supabase
  const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
    try {
      console.log('Converting image to base64 from Supabase:', imageUrl);
      
      // Return placeholder immediately for empty/placeholder images
      if (!imageUrl || imageUrl.includes('placeholder') || imageUrl.trim() === '') {
        console.log('Using placeholder for empty/placeholder image');
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      }

      // First try: Use Supabase storage API if it's a Supabase URL
      if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
        try {
          const urlParts = imageUrl.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('/');
            const bucketName = pathParts[0];
            const filePath = pathParts.slice(1).join('/');

            console.log('Extracted bucket:', bucketName, 'file path:', filePath);

            if (bucketName && filePath) {
              const { data, error } = await supabase.storage
                .from(bucketName)
                .download(filePath);

              if (!error && data) {
                console.log('Downloaded blob size:', data.size, 'type:', data.type);
                
                // Convert blob to base64
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    console.log('Base64 conversion successful, length:', result.length);
                    resolve(result);
                  };
                  reader.onerror = () => {
                    console.error('FileReader error');
                    reject(new Error('FileReader failed'));
                  };
                  reader.readAsDataURL(data);
                });
                
                return base64;
              } else {
                console.error('Supabase storage error:', error);
              }
            }
          }
        } catch (supabaseError) {
          console.error('Supabase method failed:', supabaseError);
        }
      }

      // Second try: Direct fetch with proper error handling and CORS handling
      console.log('Attempting direct fetch for:', imageUrl);
      
      const response = await fetch(imageUrl, {
        method: 'GET',
        mode: 'cors', // Try CORS first
        cache: 'no-cache',
        headers: {
          'Accept': 'image/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Direct fetch - blob size:', blob.size, 'type:', blob.type);

      // Verify it's actually an image
      if (!blob.type.startsWith('image/')) {
        console.warn('Fetched content is not an image, type:', blob.type);
        throw new Error('Not an image');
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          console.log('Direct fetch base64 conversion successful, length:', result.length);
          resolve(result);
        };
        reader.onerror = () => {
          console.error('Direct fetch FileReader error');
          reject(new Error('FileReader failed'));
        };
        reader.readAsDataURL(blob);
      });

      return base64;

    } catch (error) {
      console.error('Error in convertImageToBase64:', error);
      
      // Third try: Create a simple colored placeholder based on tile name
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Generate a color based on the image URL hash
          const hash = imageUrl.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          const hue = Math.abs(hash) % 360;
          ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
          ctx.fillRect(0, 0, 60, 60);
          
          // Add a simple tile pattern
          ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
          ctx.lineWidth = 2;
          ctx.strokeRect(5, 5, 50, 50);
          ctx.strokeRect(15, 15, 30, 30);
          
          const base64 = canvas.toDataURL('image/png');
          console.log('Generated colored placeholder');
          return base64;
        }
      } catch (canvasError) {
        console.error('Canvas placeholder generation failed:', canvasError);
      }
      
      // Final fallback: transparent pixel
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    }
  };

  const generateQuotationHTML = async (quotation: Quotation): Promise<string> => {
    const { quotation_items = [], customer, worker, quotation_number, created_at, notes, wastage_percentage = 0 } = quotation;
    
    // Group items by tile for calculations
    const tileCalculations: { [tileId: string]: any } = {};
    
    quotation_items.forEach((item: any) => {
      const tileId = item.tile_id;
      if (!tileCalculations[tileId] && item.tile) {
        tileCalculations[tileId] = {
          tile: item.tile,
          rooms: [],
          totalArea: 0,
          tilesNeeded: 0,
          boxesNeeded: 0,
          totalPrice: 0,
          customBoxAdjustment: item.custom_boxes || 0
        };
      }
      
      if (item.room && tileCalculations[tileId]) {
        const roomAreaInSqFt = parseFloat(item.area?.toString()) || 0;
        tileCalculations[tileId].rooms.push({
          name: item.room.name,
          area: roomAreaInSqFt,
          layerNumber: item.layer_number
        });
        tileCalculations[tileId].totalArea += roomAreaInSqFt;
      }
    });

    // Convert all tile images to base64 with better error handling
    console.log('Starting image conversion for', Object.keys(tileCalculations).length, 'tiles');
    
    const imagePromises = Object.entries(tileCalculations).map(async ([tileId, calc]) => {
      try {
        const imageUrl = calc.tile?.image_url || '';
        console.log(`Converting image for tile ${tileId}:`, imageUrl);
        
        const base64Image = await convertImageToBase64(imageUrl);
        
        return {
          tileId,
          calc: {
            ...calc,
            tile_image_base64: base64Image
          }
        };
      } catch (error) {
        console.error(`Failed to convert image for tile ${tileId}:`, error);
        return {
          tileId,
          calc: {
            ...calc,
            tile_image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
          }
        };
      }
    });

    // Wait for all images to be processed
    const tileCalculationsWithImages = await Promise.all(imagePromises);
    console.log('All images processed');

    // Update tileCalculations with base64 images
    tileCalculationsWithImages.forEach(({ tileId, calc }) => {
      tileCalculations[tileId] = calc;
    });

    // Calculate requirements for each tile
    Object.values(tileCalculations).forEach((calc: any) => {
      const tile = calc.tile;
      if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
        const tileLengthFt = (tile.size_length || 0) / 304.8;
        const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;
        
        if (tileAreaSqFt > 0) {
          const basicTilesNeeded = Math.ceil(calc.totalArea / tileAreaSqFt);
          calc.tilesNeeded = Math.ceil(basicTilesNeeded * (1 + (wastage_percentage / 100)));
          const baseBoxes = Math.ceil(calc.tilesNeeded / tile.pieces_per_box);
          calc.boxesNeeded = Math.max(0, baseBoxes + calc.customBoxAdjustment);
          calc.totalPrice = calc.boxesNeeded * tile.price_per_box;
        }
      }
    });

    const calculations = Object.values(tileCalculations);
    const grandTotal = calculations.reduce((sum: number, calc: any) => sum + calc.totalPrice, 0);
    const totalBoxes = calculations.reduce((sum: number, calc: any) => sum + calc.boxesNeeded, 0);
    const totalTileTypes = Object.keys(tileCalculations).length;

    const formatTileSize = (sizeLength?: number, sizeBreadth?: number) => {
      if (!sizeLength || !sizeBreadth) return 'N/A';
      
      const lengthInMm = sizeLength;
      const widthInMm = sizeBreadth;
      
      if (lengthInMm >= 1000 || widthInMm >= 1000) {
        const lengthInM = (lengthInMm / 1000).toFixed(1);
        const widthInM = (widthInMm / 1000).toFixed(1);
        return `${lengthInM} × ${widthInM} m`;
      } else if (lengthInMm >= 100 || widthInMm >= 100) {
        const lengthInCm = (lengthInMm / 10).toFixed(0);
        const widthInCm = (widthInMm / 10).toFixed(0);
        return `${lengthInCm} × ${widthInCm} cm`;
      } else {
        return `${lengthInMm} × ${widthInMm} mm`;
      }
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quotation ${quotation_number}</title>
        <style>
          @media print {
            @page { 
              margin: 0.5in; 
              size: A4;
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 12px; 
              line-height: 1.4;
              color: #000;
              margin: 0;
              padding: 0;
            }
          }
          
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 20px;
            background: white;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin: 0;
          }
          
          .document-type {
            font-size: 16px;
            color: #666;
            margin: 5px 0 0 0;
            font-weight: normal;
          }
          
          .meta-info {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #666;
            margin-bottom: 15px;
          }
          
          .details-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 20px;
          }
          
          .details-box h3 {
            color: #2563eb;
            font-size: 14px;
            margin: 0 0 10px 0;
            font-weight: bold;
          }
          
          .details-box p {
            margin: 3px 0;
            font-size: 12px;
          }
          
          .details-box strong {
            display: inline-block;
            width: 80px;
            font-weight: bold;
          }
          
          .table-container {
            margin-top: 20px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
          }
          
          th {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            padding: 8px 6px;
            text-align: center;
            font-weight: bold;
            font-size: 10px;
          }
          
          td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: center;
            vertical-align: top;
          }
          
          .room-cell {
            text-align: left;
            font-size: 10px;
          }
          
          .tile-details {
            text-align: left;
            font-size: 10px;
          }
          
          .tile-code {
            font-weight: bold;
            color: #000;
          }
          
          .tile-name {
            color: #666;
            margin: 2px 0;
          }
          
          .tile-size {
            color: #888;
            font-size: 9px;
          }
          
          .price-cell {
            text-align: right;
            font-weight: bold;
          }
          
          .tile-image {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid #ddd;
            display: block;
            margin: 0 auto;
            background-color: #f9f9f9;
          }
          
          .image-cell {
            text-align: center;
            padding: 4px;
            width: 60px;
          }
          
          .summary-section {
            margin-top: 15px;
            text-align: right;
          }
          
          .summary-line {
            margin: 5px 0;
            font-size: 12px;
          }
          
          .total-amount {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            border-top: 2px solid #2563eb;
            padding-top: 5px;
            margin-top: 10px;
          }
          
          .footer-notes {
            margin-top: 30px;
            font-size: 10px;
            color: #666;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          
          .footer-notes p {
            margin: 3px 0;
          }
          
          .wastage-note {
            color: #e11d48;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="company-name">Tile Solutions</h1>
            <h2 class="document-type">QUOTATION</h2>
          </div>
          
          <div class="meta-info">
            <span>${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString('en-US', { hour12: true })}</span>
            <span>Quotation ${quotation_number}</span>
          </div>
          
          <div class="details-section">
            <div class="details-box">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${customer?.name || 'Sample Customer'}</p>
              <p><strong>Mobile:</strong> ${customer?.mobile || '9943568780'}</p>
            </div>
            
            <div class="details-box">
              <h3>Quotation Details</h3>
              <p><strong>Quotation #:</strong> ${quotation_number}</p>
              <p><strong>Date:</strong> ${new Date(created_at).toLocaleDateString('en-GB')}</p>
              <p><strong>Status:</strong> ${quotation.status?.toUpperCase() || 'DRAFT'}</p>
              <p><strong>Created by:</strong> ${worker?.name || 'SAMPLE WORKER'}</p>
              <p><strong>Wastage:</strong> ${wastage_percentage}%</p>
            </div>
          </div>
          
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="width: 20%;">Room(s) & Area</th>
                  <th style="width: 25%;">Tile Details</th>
                  <th style="width: 8%;">Image</th>
                  <th style="width: 12%;">Tiles Required</th>
                  <th style="width: 8%;">Boxes</th>
                  <th style="width: 12%;">Price/Box</th>
                  <th style="width: 15%;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${calculations.map((calc: any) => {
                  const tile = calc.tile;
                  
                  return `
                    <tr>
                      <td class="room-cell">
                        ${calc.rooms.map((room: any) => `
                          <strong>${room.name}</strong><br>
                          (Layers: ${room.layerNumber || 'N/A'})<br>
                        `).join('')}
                        Total Area: ${calc.totalArea.toFixed(2)} sq ft
                        ${calc.rooms.length > 1 ? '<br>(includes 2 layers)' : ''}
                      </td>
                      <td class="tile-details">
                        <div class="tile-code">Code: ${tile.code}</div>
                        <div class="tile-name">${tile.name}</div>
                        <div class="tile-size">Size: ${formatTileSize(tile.size_length, tile.size_breadth)}</div>
                        <div class="tile-size">${tile.pieces_per_box} per box (${tile.pieces_per_box} pcs)</div>
                      </td>
                       <td class="image-cell">
                         ${calc.tile_image_base64 ? `
                           <img 
                             src="${calc.tile_image_base64}" 
                             alt="${tile.name}"
                             class="tile-image"
                             style="${tile.size_length > tile.size_breadth ? 'transform: rotate(90deg); width: 50px; height: 50px;' : 'width: 50px; height: 50px;'} object-fit: contain; border-radius: 4px; border: 1px solid #ddd; display: block; margin: 0 auto; background-color: #f9f9f9;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                           />
                           <div style="display: none; width: 50px; height: 50px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">No Image</div>
                         ` : `
                           <div style="width: 50px; height: 50px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">No Image</div>
                         `}
                       </td>
                      <td>
                        ${calc.tilesNeeded} tiles<br>
                        <small>(${(() => {
                          const fullBoxes = Math.floor(calc.tilesNeeded / (tile.pieces_per_box || 1));
                          const leftoverTiles = calc.tilesNeeded % (tile.pieces_per_box || 1);
                          if (leftoverTiles > 0) {
                            return `${fullBoxes} box${fullBoxes !== 1 ? 'es' : ''} and ${leftoverTiles} tile${leftoverTiles > 1 ? 's' : ''}`;
                          }
                          return `${fullBoxes} box${fullBoxes !== 1 ? 'es' : ''}`;
                        })()})</small><br>
                        <small class="wastage-note">+${wastage_percentage}% wastage</small>
                      </td>
                      <td>${calc.boxesNeeded}</td>
                      <td class="price-cell">₹${tile.price_per_box}</td>
                      <td class="price-cell">₹${calc.totalPrice.toLocaleString()}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="summary-section">
            <div class="summary-line">Summary: ${totalTileTypes} tile type(s) | ${totalBoxes} boxes total</div>
            <div class="total-amount">Total Amount: ₹${grandTotal.toLocaleString()}</div>
          </div>
          
          <div class="footer-notes">
            <p><strong>Thank you for choosing Tile Solutions!</strong></p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
            <p><strong>Note:</strong> All tile quantities include a ${wastage_percentage}% wastage allowance.</p>
            <p>All calculations are based on square feet measurements for accuracy.</p>
          </div>
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
      console.log('Starting PDF generation for quotation:', quotation.quotation_number);
      const htmlContent = await generateQuotationHTML(quotation);
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
      toast.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
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