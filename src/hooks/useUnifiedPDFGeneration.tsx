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

  // Get proper image URL from Supabase storage and convert to base64
  const convertImageToBase64 = async (imageUrl: string, retryCount = 3): Promise<string> => {
    try {
      if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined') {
        console.log('[Image Processing] No valid image URL provided - will show "No Image" placeholder');
        return ''; // Return empty string to trigger "No Image" placeholder
      }

      console.log(`[Image Processing] Converting image: ${imageUrl} (Attempt: ${4 - retryCount}/3)`);
      
      let finalImageUrl = imageUrl;
      
      // Check if this is a Supabase storage URL pattern
      if (imageUrl.includes('/storage/v1/object/') || imageUrl.includes('supabase')) {
        try {
          // Extract bucket and path from URL
          let bucketName = '';
          let filePath = '';
          
          if (imageUrl.includes('/storage/v1/object/public/')) {
            // Public bucket URL pattern
            const parts = imageUrl.split('/storage/v1/object/public/');
            if (parts.length === 2) {
              const [bucket, ...pathParts] = parts[1].split('/');
              bucketName = bucket;
              filePath = pathParts.join('/');
            }
          } else if (imageUrl.includes('/storage/v1/object/sign/')) {
            // Signed URL pattern
            const parts = imageUrl.split('/storage/v1/object/sign/');
            if (parts.length === 2) {
              const [bucket, ...pathParts] = parts[1].split('/');
              bucketName = bucket;
              filePath = pathParts.join('/').split('?')[0]; // Remove query params
            }
          }
          
          if (bucketName && filePath) {
            console.log(`[Image Processing] Detected Supabase storage: bucket=${bucketName}, path=${filePath}`);
            
            // Try to get public URL first
            const { data: publicData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filePath);
              
            if (publicData?.publicUrl) {
              finalImageUrl = publicData.publicUrl;
              console.log(`[Image Processing] Using public URL: ${finalImageUrl}`);
            } else {
              // Fallback: try signed URL for private buckets
              const { data: signedData, error } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(filePath, 3600); // 1 hour expiry
                
              if (signedData?.signedUrl && !error) {
                finalImageUrl = signedData.signedUrl;
                console.log(`[Image Processing] Using signed URL: ${finalImageUrl}`);
              } else {
                console.warn(`[Image Processing] Failed to get signed URL:`, error?.message);
              }
            }
          }
        } catch (supabaseError) {
          console.warn(`[Image Processing] Supabase URL processing failed:`, supabaseError);
          // Continue with original URL
        }
      }

      // Now fetch the image with proper handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        console.log(`[Image Processing] Fetching image from: ${finalImageUrl}`);
        
        const response = await fetch(finalImageUrl, {
          method: 'GET',
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit', // Don't send credentials for CORS
          headers: {
            'Accept': 'image/*',
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Validate content type
        if (!blob.type.startsWith('image/')) {
          console.warn(`[Image Processing] Unexpected content type: ${blob.type}. Proceeding anyway...`);
        }

        console.log(`[Image Processing] Successfully fetched: ${blob.size} bytes, type: ${blob.type}`);

        // Convert to base64
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const result = reader.result as string;
            if (!result || !result.includes('data:')) {
              reject(new Error('Invalid base64 conversion result'));
              return;
            }
            console.log(`[Image Processing] ✓ Base64 conversion successful for ${imageUrl}`);
            resolve(result);
          };
          
          reader.onerror = () => {
            reject(new Error('FileReader failed to convert image to base64'));
          };
          
          reader.readAsDataURL(blob);
        });

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error: any) {
      console.error(`[Image Processing] ✗ Error converting ${imageUrl}:`, error.message);
      
      // Retry logic with exponential backoff
      if (retryCount > 1) {
        const delay = Math.pow(2, 4 - retryCount) * 1000; // 2s, 4s delays
        console.log(`[Image Processing] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return convertImageToBase64(imageUrl, retryCount - 1);
      }
      
      // Final failure - return empty string to show "No Image" placeholder
      console.error(`[Image Processing] ✗ All attempts failed for: ${imageUrl}`);
      return ''; // This will trigger "No Image" placeholder in HTML
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

    // Convert all tile images to base64 with progress tracking and error handling
    const totalTiles = Object.keys(tileCalculations).length;
    console.log(`[PDF Generation] Starting image conversion for ${totalTiles} tiles`);
    
    // Show progress toast for large numbers of images
    if (totalTiles > 3) {
      toast.info(`Processing ${totalTiles} tile images for PDF...`, {
        duration: 3000,
      });
    }
    
    let processedCount = 0;
    
    const imagePromises = Object.entries(tileCalculations).map(async ([tileId, calc]) => {
      try {
        const imageUrl = calc.tile?.image_url || '';
        console.log(`[PDF Generation] Processing tile ${++processedCount}/${totalTiles}: ${calc.tile?.code || tileId}`);
        
        if (!imageUrl) {
          console.warn(`[PDF Generation] No image URL for tile ${calc.tile?.code || tileId}`);
          return {
            tileId,
            calc: {
              ...calc,
              tile_image_base64: ''
            }
          };
        }
        
        const base64Image = await convertImageToBase64(imageUrl);
        
        // Log success/failure for tracking
        if (base64Image && base64Image.length > 100) {
          console.log(`[PDF Generation] ✓ Successfully processed image for tile ${calc.tile?.code || tileId}`);
        } else {
          console.warn(`[PDF Generation] ⚠ Fallback image used for tile ${calc.tile?.code || tileId}`);
        }
        
        return {
          tileId,
          calc: {
            ...calc,
            tile_image_base64: base64Image
          }
        };
      } catch (error) {
        console.error(`[PDF Generation] ✗ Failed to process image for tile ${calc.tile?.code || tileId}:`, error);
        return {
          tileId,
          calc: {
            ...calc,
            tile_image_base64: '' // Empty string will trigger "No Image" placeholder
          }
        };
      }
    });

    // Wait for all images to be processed with timeout
    const tileCalculationsWithImages = await Promise.allSettled(imagePromises);
    
    // Process results and count successes/failures
    let successCount = 0;
    let failureCount = 0;
    const processedCalculations: any[] = [];
    
    tileCalculationsWithImages.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { tileId, calc } = result.value;
        processedCalculations.push({ tileId, calc });
        
        if (calc.tile_image_base64 && calc.tile_image_base64.length > 100) {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        console.error(`[PDF Generation] Promise failed for tile:`, result.reason);
        failureCount++;
        // Add fallback entry
        const tileEntries = Object.entries(tileCalculations);
        if (tileEntries[index]) {
          const [tileId, calc] = tileEntries[index];
          processedCalculations.push({
            tileId,
            calc: {
              ...calc,
              tile_image_base64: ''
            }
          });
        }
      }
    });
    
    console.log(`[PDF Generation] Image processing complete: ${successCount} successful, ${failureCount} failed out of ${totalTiles} total`);
    
    // Show completion notification for larger sets
    if (totalTiles > 3) {
      if (failureCount === 0) {
        toast.success(`All ${totalTiles} tile images processed successfully!`);
      } else if (successCount > 0) {
        toast.warning(`Processed ${successCount}/${totalTiles} images. ${failureCount} will show as placeholders.`);
      } else {
        toast.error(`Failed to load any tile images. PDF will show placeholders.`);
      }
    }

    // Update tileCalculations with base64 images
    processedCalculations.forEach(({ tileId, calc }) => {
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
                            <div style="width: 60px; height: 50px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                              <img 
                                src="${calc.tile_image_base64}" 
                                alt="${tile.name}"
                                style="
                                  max-width: 100%; 
                                  max-height: 100%; 
                                  object-fit: contain; 
                                  border-radius: 4px; 
                                  border: 1px solid #ddd; 
                                  background-color: #fff;
                                  ${tile.size_length > tile.size_breadth ? 'transform: rotate(90deg);' : ''}
                                "
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                              />
                              <div style="display: none; width: 50px; height: 40px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; align-items: center; justify-content: center; font-size: 9px; color: #999; text-align: center;">No Image</div>
                            </div>
                          ` : `
                            <div style="width: 50px; height: 40px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; text-align: center;">No Image</div>
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