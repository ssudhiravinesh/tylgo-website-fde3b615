import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';

interface TileData {
  id: string;
  code: string;
  category?: string;
  size_length: number;
  size_breadth: number;
  price_per_box?: number | null;
  pieces_per_box?: number | null;
  image_url?: string | null;
}

export const useUnifiedPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to wait for all images to load in a window
  const waitForAllImages = (win: Window): Promise<void> => {
    return new Promise((resolve) => {
      const images = Array.from(win.document.images);

      if (images.length === 0) {
        resolve();
        return;
      }

      const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>(r => {
          img.onload = () => r();
          img.onerror = () => r();
        });
      });

      Promise.all(promises).then(() => resolve());
    });
  };

  // Get direct public URL for Supabase images - simplified for public bucket
  const getDirectImageUrl = (imageUrl: string): string => {
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined') {
      return '';
    }

    // If it's already a direct public URL, return as is
    if (imageUrl.includes('/storage/v1/object/public/tile-images/')) {
      return imageUrl;
    }

    // Handle different Supabase URL formats
    try {
      let filePath = '';

      if (imageUrl.includes('/storage/v1/object/sign/tile-images/')) {
        const parts = imageUrl.split('/storage/v1/object/sign/tile-images/');
        if (parts.length === 2) {
          filePath = parts[1].split('?')[0];
        }
      } else if (imageUrl.includes('tile-images/')) {
        const parts = imageUrl.split('tile-images/');
        if (parts.length === 2) {
          filePath = parts[1].split('?')[0];
        }
      }

      if (filePath) {
        const { data } = supabase.storage.from('tile-images').getPublicUrl(filePath);
        return data.publicUrl;
      }
    } catch (error) {
      console.warn(`[PDF Generation] Error processing URL ${imageUrl}:`, error);
    }

    // Return original URL if processing fails
    return imageUrl;
  };


  // Helper to convert URL to Base64
  const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (result && result.startsWith('data:image')) {
            resolve(result);
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('[PDF Generation] Failed to convert image to base64:', error);
      return null;
    }
  };

  const generateQuotationHTML = async (quotation: Quotation) => {
    const {
      quotation_number,
      customer,
      worker,
      wastage_percentage = 0,
      discount_percentage: discountPercentage = 0,
      discount_amount: discountAmount = 0,
      created_at,
      quotation_items = []
    } = quotation;

    const chromeFixCSS = ''; // Placeholder for any specific Chrome print CSS fixes

    // Calculate tile requirements
    const tileCalculations: Record<string, any> = {};
    const productCalculations: any[] = [];

    // Process Items
    quotation_items.forEach((item) => {
      // 1. Tile Items (Rooms/Staircases)
      if (item.tile_id) {
        const tileId = item.tile_id;
        if (!tileCalculations[tileId]) {
          tileCalculations[tileId] = {
            type: 'tile',
            tile: item.tile || { code: 'Unknown', size_length: 0, size_breadth: 0, price_per_box: 0, pieces_per_box: 0 },
            totalArea: 0,
            customBoxAdjustment: 0,
            rooms: [],
            staircases: [],
            totalPrice: 0,
            tilesNeeded: 0,
            boxesNeeded: 0
          };
        }

        // Only add area for rooms if room exists
        if (item.room) {
          tileCalculations[tileId].totalArea += Number(item.area || 0);
          tileCalculations[tileId].rooms.push({
            ...item.room,
            layerNumber: item.layer_number,
            measurements: item.room.measurements
          });
        }

        // Staircases
        const staircase = (item as any).staircase || item.staircases;
        if (staircase) {
          tileCalculations[tileId].staircases.push({
            ...staircase,
            quantity: (item as any).quantity || 0,
            tile_type: (item as any).tile_type
          });
        }

        // Custom boxes
        tileCalculations[tileId].customBoxAdjustment += Number(item.custom_boxes || 0);

      } else if (item.product_id) {
        // 2. Product Items
        productCalculations.push({
          type: 'product',
          product: item.product,
          quantity: item.quantity,
          totalPrice: (item.total_price) || ((item.product?.price || 0) * (item.quantity || 0)),
          imageUrl: item.product?.image_url // Store image URL
        });
      }
    });

    // Process images
    const totalTiles = Object.keys(tileCalculations).length;

    // Fix: Use Promise.all to wait for all async operations to complete
    await Promise.all(Object.entries(tileCalculations).map(async ([tileId, calc]) => {
      let imageUrl = getDirectImageUrl(calc.tile.image_url);
      let finalUrl: string = '';

      if (imageUrl) {
        try {
          // Convert to base64 for reliable PDF rendering
          const base64Url = await urlToBase64(imageUrl);
          if (base64Url) {
            finalUrl = base64Url;
          } else {
            finalUrl = imageUrl;
          }
        } catch (e) {
          console.warn(`[PDF Generation] Error processing image for tile ${tileId}`, e);
          finalUrl = imageUrl;
        }
      }

      tileCalculations[tileId].tile_image_direct_url = finalUrl;
    }));


    // Process logo
    const logoUrl = '/tylgo.svg';
    let logoBase64 = '';
    try {
      const base64 = await urlToBase64(logoUrl);
      if (base64) {
        logoBase64 = base64;
      }
    } catch (e) {
      console.warn('[PDF Generation] Error processing logo:', e);
    }

    // Process product images
    await Promise.all(productCalculations.map(async (calc) => {
      if (calc.product?.image_url) {
        try {
          const base64Url = await urlToBase64(calc.product.image_url);
          calc.product_image_direct_url = base64Url || calc.product.image_url;
        } catch (e) {
          console.warn(`[PDF Generation] Error processing image for product ${calc.product.name}`, e);
          calc.product_image_direct_url = calc.product.image_url;
        }
      }
    }));


    // Calculate requirements for each tile
    Object.values(tileCalculations).forEach((calc: any) => {
      const tile = calc.tile;
      if (tile && tile.size_length && tile.size_breadth && tile.pieces_per_box && tile.price_per_box) {
        const tileLengthFt = (tile.size_length || 0) / 304.8;
        const tileBreadthFt = (tile.size_breadth || 0) / 304.8;
        const tileAreaSqFt = tileLengthFt * tileBreadthFt;

        // Base tiles from Area (Rooms)
        let totalTilesNeeded = 0;

        if (calc.totalArea > 0 && tileAreaSqFt > 0) {
          const basicTilesFromArea = Math.ceil(calc.totalArea / tileAreaSqFt);
          totalTilesNeeded += Math.ceil(basicTilesFromArea * (1 + (wastage_percentage / 100)));
        }

        // Add tiles from Staircases (Direct Quantity)
        if (calc.staircases && calc.staircases.length > 0) {
          const staircaseTiles = calc.staircases.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
          totalTilesNeeded += Math.ceil(staircaseTiles * (1 + (wastage_percentage / 100)));
        }

        if (totalTilesNeeded > 0) {
          calc.tilesNeeded = totalTilesNeeded;
          const baseBoxes = Math.ceil(calc.tilesNeeded / tile.pieces_per_box);
          calc.boxesNeeded = Math.max(0, baseBoxes + calc.customBoxAdjustment);
          calc.totalPrice = calc.boxesNeeded * tile.price_per_box;
        }
      }
    });

    const tileItems = Object.values(tileCalculations);
    const allItems = [...tileItems, ...productCalculations];

    const mrp = allItems.reduce((sum: number, calc: any) => sum + calc.totalPrice, 0);
    const finalTotal = mrp - discountAmount;
    const totalBoxes = tileItems.reduce((sum: number, calc: any) => sum + calc.boxesNeeded, 0);
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
          ${chromeFixCSS}   
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
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
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
          
          .image-cell {
            text-align: center;
            padding: 4px;
            width: 60px;
          }
          
          .tile-image {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid #ddd;
            background-color: #fff;
            display: block;
            margin: 0 auto;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          
          .no-image-placeholder {
            width: 50px;
            height: 40px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: #999;
            text-align: center;
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
        ${logoBase64 ? `<link rel="icon" href="${logoBase64}" type="image/svg+xml">` : ''}
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoBase64 ?
        `<img src="${logoBase64}" alt="TYLGO" style="height: 40px; margin-bottom: 5px;">` :
        `<h1 class="company-name">TYLGO</h1>`
      }
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
            ${discountPercentage > 0 ? `
              <p><strong>Discount:</strong> ${discountPercentage}%</p>
            ` : ''}
          </div>

          </div>
          
          <div class="table-container">
            ${tileItems.length > 0 ? `
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
                  ${tileItems.map((calc: any) => {
        const tile = calc.tile;

        // Group rooms and prepare staircases for display
        let breakdownHTML = '';

        // 1. ROOMS BREAKDOWN
        if (calc.rooms && calc.rooms.length > 0) {
          const roomGroups: { [roomName: string]: { room: any, layers: number[] } } = {};

          calc.rooms.forEach((room: any) => {
            const roomKey = room.name;
            if (!roomGroups[roomKey]) {
              roomGroups[roomKey] = { room, layers: [] };
            }
            if (room.layerNumber !== null && room.layerNumber !== undefined) {
              roomGroups[roomKey].layers.push(room.layerNumber);
            }
            if ((!roomGroups[roomKey].room.measurements?.length) && room.measurements?.length > 0) {
              roomGroups[roomKey].room.measurements = room.measurements;
            }
          });

          breakdownHTML += Object.values(roomGroups).map(({ room, layers }) => {
            let roomDisplay = `<strong>${room.name}</strong>`;

            if (room.measurements && room.measurements.length > 0) {
              roomDisplay += `<div style="margin-top:2px; margin-bottom:2px;">`;
              room.measurements.forEach((m: any, idx: number) => {
                const len = parseFloat(m.length || m.size_length || 0);
                const wid = parseFloat(m.width || m.breadth || m.size_breadth || 0);
                if (len > 0 && wid > 0) {
                  roomDisplay += `<div style="color: #555; font-size: 9px;">Shape ${idx + 1}: ${len} × ${wid} ${room.unit || 'ft'}</div>`;
                }
              });
              roomDisplay += `</div>`;
            } else {
              const isWall = room.room_type === 'wall';
              const l = isWall ? (room.wall_length || room.length || 0) : (room.length || 0);
              const w = isWall ? (room.wall_height || room.width || 0) : (room.width || 0);
              const isAreaHack = w == 1 || w == '1';
              if (!isAreaHack && l > 0 && w > 0) {
                const dims = `${l} × ${w} ${room.unit || 'ft'}`;
                roomDisplay += `<br><span style="color: #555; font-size: 9px; font-style: italic;">Dim: ${dims}</span>`;
              }
            }

            if (layers.length > 0) {
              roomDisplay += `<br><span style="font-size: 9px; color: #666;">(LAYERS: ${layers.sort((a: number, b: number) => a - b).join(', ')})</span>`;
            }
            return roomDisplay;
          }).join('<br><br>');

          if (calc.totalArea > 0) {
            breakdownHTML += `<br><br><span style="border-top: 1px dashed #ccc; padding-top: 4px; display: block;">Total Area: <strong>${calc.totalArea.toFixed(2)} sq ft</strong></span>`;
          }
        }

        // 2. STAIRCASES BREAKDOWN
        if (calc.staircases && calc.staircases.length > 0) {
          if (breakdownHTML) breakdownHTML += '<br><hr style="border: 0; border-top: 1px dashed #eee; margin: 8px 0;"><br>';

          breakdownHTML += calc.staircases.map((s: any) => {
            const tileType = s.tile_type === 'step' ? 'Step' : s.tile_type === 'riser' ? 'Riser' : 'Tile';
            return `
               <strong>${s.name || 'Staircase'}</strong>
               <div style="font-size: 9px; color: #555;">
                  ${tileType} - ${s.quantity} pcs
               </div>
             `;
          }).join('<br><br>');
        }

        return `
                    <tr>
                      <td class="room-cell">
                        ${breakdownHTML || '<span style="color:#999; font-style:italic;">No room/staircase details</span>'}
                      </td>
                      
                      <td class="tile-details">
                        <div class="tile-code">Code: ${tile.code}</div>
                        <div class="tile-name">${tile.category || ''}</div>
                        <div class="tile-size">Size: ${formatTileSize(tile.size_length, tile.size_breadth)}</div>
                        <div class="tile-size">${tile.pieces_per_box} per box (${tile.pieces_per_box} pcs)</div>
                      </td>

                      <td class="image-cell">
                      ${calc.tile_image_direct_url ? `
                        <img
                          src="${calc.tile_image_direct_url}"
                          alt="Tile ${tile.code}"
                          class="tile-image"
                          loading="eager"
                          style="${tile.size_length > tile.size_breadth ? 'transform: rotate(90deg);' : ''}"
                        />
                      ` : `
                        <div class="no-image-placeholder">No Image</div>
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
            ` : '<tr><td colspan="7" style="text-align:center; padding: 20px;">No tiles in this quotation</td></tr>'}

            ${productCalculations.length > 0 ? `
            <div style="margin-top: 30px;">
                <h3 style="color: #2563eb; font-size: 14px; margin-bottom: 10px; font-weight: bold;">Product Selection</h3>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 35%;">Product Details</th>
                      <th style="width: 15%;">Code</th>
                      <th style="width: 10%;">Image</th>
                      <th style="width: 15%;">Quantity</th>
                      <th style="width: 10%;">Price/Unit</th>
                      <th style="width: 15%;">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productCalculations.map((calc: any) => `
                        <tr>
                          <td class="tile-details">
                            <div class="tile-code" style="font-size:12px;">${calc.product?.name || 'Unknown Product'}</div>
                          </td>
                          <td class="tile-details">
                            <div class="tile-name text-center">${calc.product?.code || ''}</div>
                          </td>
                          <td class="image-cell">
                             ${calc.product_image_direct_url ? `
                               <img
                                 src="${calc.product_image_direct_url}"
                                 alt="${calc.product?.name}"
                                 class="tile-image"
                                 loading="eager"
                               />
                             ` : `
                               <div class="no-image-placeholder">No Image</div>
                             `}
                          </td>
                          <td>
                            ${calc.quantity} units
                          </td>
                          <td class="price-cell">₹${calc.product?.price?.toLocaleString() || 0}</td>
                          <td class="price-cell">₹${calc.totalPrice.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                  </tbody>
                </table>
            </div>
            ` : ''}
          </div>
          
         <div class="summary-section">
          <div class="summary-line">Summary: ${totalTileTypes} tile type(s) | ${totalBoxes} boxes total</div>
          <div class="summary-row">
            <span class="summary-label">MRP (Before Discount):</span>
            <span class="summary-value">₹${mrp.toLocaleString('en-IN')}</span>
          </div>
          ${discountPercentage > 0 ? `
            <div class="summary-row discount-row">
              <span class="summary-label">Discount (${discountPercentage}%):</span>
              <span class="summary-value">-₹${discountAmount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div class="total-amount">
            ${discountPercentage > 0 ? 'Final Grand Total:' : 'Total Amount:'} ₹${finalTotal.toLocaleString('en-IN')}
          </div>
        </div>

          
          <div class="footer-notes">
            <p><strong>Thank you for choosing Tile Solutions!</strong></p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
            <p><strong>Note:</strong> All tile quantities include a ${wastage_percentage}% wastage allowance.</p>
            <p>All calculations are based on square feet measurements for accuracy.</p>
          </div>
        </div>
        
        <script>
          console.log('PDF content loaded and ready');
          console.log('PDF content loaded and ready');
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
      console.log('[PDF Generation] Starting PDF generation for quotation:', quotation.quotation_number);

      const htmlContent = await generateQuotationHTML(quotation);

      const printWindow = window.open('', '_blank');

      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        await new Promise<void>(resolve => {
          if (printWindow.document.readyState === 'complete') {
            resolve();
          } else {
            printWindow.addEventListener('DOMContentLoaded', () => resolve());
          }
        });

        const style = printWindow.document.createElement('style');
        style.textContent = `
          @media screen {
            body { 
              color: #000 !important;
              background: white !important;
            }
          }
        `;
        printWindow.document.head.appendChild(style);

        if (printWindow.matchMedia) {
          const printMedia = printWindow.matchMedia('print');
        }

        console.log('[PDF Generation] Print media context prepared, waiting for images...');

        await waitForAllImages(printWindow);

        printWindow.focus();
        printWindow.print();

        console.log('[PDF Generation] ✓ PDF generation complete');

      } else {
        toast.error('Please allow popups to generate PDF');
      }
    } catch (error: any) {
      console.error('[PDF Generation] ✗ Error generating PDF:', error);
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
