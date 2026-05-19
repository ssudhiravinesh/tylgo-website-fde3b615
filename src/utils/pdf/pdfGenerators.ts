import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';
import {
  calculateFromQuotationItems,
  type TileCalcResult,
  type ProductCalcResult,
} from '@/utils/calculations/quotationItemCalculator';

export interface TileData {
  id: string;
  code: string;
  category?: string;
  size_length: number;
  size_breadth: number;
  price_per_box?: number | null;
  pieces_per_box?: number | null;
  image_url?: string | null;
}

export const getDirectImageUrl = (imageUrl: string): string => {
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
export const urlToBase64 = async (url: string): Promise<string | null> => {
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

export const generateQuotationHTML = async (quotation: Quotation) => {
    const {
      quotation_number,
      customer,
      worker,
      wastage_percentage = 0,
      discount_percentage: discountPercentage = 0,
      discount_amount: discountAmount = 0,
      round_off_amount: roundOffAmount = 0,
      created_at,
      quotation_items = []
    } = quotation;

    const chromeFixCSS = ''; // Placeholder for any specific Chrome print CSS fixes

    // ── Delegate all calculation to the unified calculator ──────────────
    // This is the SAME engine used in QuotationDetails, so numbers will always match.
    const { calculations: unifiedCalcs } = calculateFromQuotationItems(
      quotation_items as any[],
      wastage_percentage
    );

    // Re-shape into the HTML template's expected `tileCalculations` / `productCalculations` maps
    const tileCalculations: Record<string, any> = {};
    const productCalculations: any[] = [];

    for (const calc of unifiedCalcs) {
      if (calc.type === 'tile') {
        const tc = calc as TileCalcResult;
        // Reconstruct rooms list with layerNumber for the display breakdown
        const rooms = tc.rooms.map(r => ({
          ...r,
          layerNumber: r.layerNumber ?? null,
        }));
        tileCalculations[tc.tile.id] = {
          type: 'tile',
          tile: tc.tile,
          totalArea: tc.totalArea,
          customBoxAdjustment: tc.customBoxAdjustment,
          rooms,
          staircases: tc.staircases.map(s => ({
            name: s.name,
            quantity: s.quantity,
            tile_type: s.type,
          })),
          tilesNeeded: tc.tilesNeeded,
          boxesNeeded: tc.boxesNeeded,
          totalPrice: tc.totalPrice,
          tile_image_direct_url: '', // filled below
        };
      } else {
        const pc = calc as ProductCalcResult;
        productCalculations.push({
          type: 'product',
          product: pc.product,
          quantity: pc.quantity,
          totalPrice: pc.totalPrice,
          product_image_direct_url: '', // filled below
        });
      }
    }

    // ── Image processing ─────────────────────────────────────────────────
    // Tile images
    await Promise.all(Object.entries(tileCalculations).map(async ([tileId, calc]) => {
      const imageUrl = getDirectImageUrl(calc.tile.image_url);
      if (imageUrl) {
        try {
          const base64Url = await urlToBase64(imageUrl);
          calc.tile_image_direct_url = base64Url || imageUrl;
        } catch (e) {
          console.warn(`[PDF Generation] Error processing image for tile ${tileId}`, e);
          calc.tile_image_direct_url = imageUrl;
        }
      }
    }));

    // Logo
    const logoUrl = '/tylgo-logo.png';
    let logoBase64 = '';
    try {
      const base64 = await urlToBase64(logoUrl);
      if (base64) logoBase64 = base64;
    } catch (e) {
      console.warn('[PDF Generation] Error processing logo:', e);
    }

    // Product images
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

    // ── Totals ────────────────────────────────────────────────────────────
    const tileItems = Object.values(tileCalculations);
    const allItems = [...tileItems, ...productCalculations];

    const mrp = allItems.reduce((sum: number, calc: any) => sum + calc.totalPrice, 0);

    // Compute per-item discounted prices with Math.round()
    if (discountPercentage > 0) {
      tileItems.forEach((calc: any) => {
        const originalPricePerBox = calc.tile.price_per_box || 0;
        calc.discountedPricePerBox = Math.round(originalPricePerBox * (1 - discountPercentage / 100));
        calc.discountedTotalPrice = calc.boxesNeeded * calc.discountedPricePerBox;
      });
      productCalculations.forEach((calc: any) => {
        const originalPrice = calc.product?.price || 0;
        calc.discountedPricePerUnit = Math.round(originalPrice * (1 - discountPercentage / 100));
        calc.discountedTotalPrice = calc.quantity * calc.discountedPricePerUnit;
      });
    }

    // Grand total: sum of per-item discounted totals (or MRP if no discount)
    const finalTotal = discountPercentage > 0
      ? allItems.reduce((sum: number, calc: any) => sum + (calc.discountedTotalPrice ?? calc.totalPrice), 0)
      : mrp;
    const computedDiscountAmount = mrp - finalTotal;
    const displayTotal = finalTotal - roundOffAmount;

    const totalBoxes = tileItems.reduce((sum: number, calc: any) => sum + calc.boxesNeeded, 0);
    const totalTileTypes = Object.keys(tileCalculations).length;

    const formatTileSize = (sizeLength?: number, sizeBreadth?: number) => {
      if (!sizeLength || !sizeBreadth) return 'N/A';
      return `${sizeLength} × ${sizeBreadth} mm`;
    };


    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quotation ${quotation_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          ${chromeFixCSS}   
          @media print {
            @page { 
              margin: 0.4in 0.5in; 
              size: A4;
            }
            body { 
              font-family: 'Manrope', sans-serif; 
              font-size: 12px; 
              line-height: 1.4;
              color: #1a1f2e;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          
          body { 
            font-family: 'Manrope', sans-serif; 
            font-size: 12px; 
            line-height: 1.5;
            color: #1a1f2e;
            margin: 0;
            padding: 20px;
            background: #faf8f5;
            letter-spacing: -0.01em;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          }
          
          .header {
            background: #161B26;
            color: white;
            padding: 18px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          
          .company-name {
            font-size: 22px;
            font-weight: 800;
            color: white;
            margin: 0;
            letter-spacing: -0.04em;
          }
          
          .company-name .accent {
            color: #F59E0B;
          }
          
          .document-type {
            font-size: 11px;
            color: #F59E0B;
            margin: 0;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }
          
          .header-right {
            text-align: right;
            font-size: 11px;
            color: rgba(255,255,255,0.7);
          }
          
          .header-right strong {
            color: white;
            font-weight: 700;
          }
          
          .meta-info {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #78716c;
            margin-bottom: 12px;
            padding: 10px 28px;
            background: #faf8f5;
            border-bottom: 1px solid #e8e2db;
          }
          
          .details-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 16px;
            padding: 0 28px;
          }
          
          .details-box h3 {
            color: #161B26;
            font-size: 11px;
            margin: 0 0 8px 0;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.10em;
            padding-bottom: 6px;
            border-bottom: 2px solid #F59E0B;
            display: inline-block;
          }
          
          .details-box p {
            margin: 3px 0;
            font-size: 12px;
            color: #44403c;
          }
          
          .details-box strong {
            display: inline-block;
            width: 85px;
            font-weight: 600;
            color: #1a1f2e;
          }
          
          .table-container {
            margin-top: 14px;
            padding: 0 28px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 11px;
          }
          
          th {
            background: #161B26;
            color: rgba(255,255,255,0.9);
            border: none;
            padding: 8px 6px;
            text-align: center;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          
          th:first-child { border-radius: 4px 0 0 0; }
          th:last-child { border-radius: 0 4px 0 0; }
          
          td {
            border-bottom: 1px solid #e8e2db;
            padding: 6px 6px;
            text-align: center;
            vertical-align: top;
          }
          
          tr:last-child td {
            border-bottom: none;
          }
          
          tbody tr:nth-child(even) {
            background: #faf8f5;
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
            font-weight: 700;
            color: #161B26;
          }
          
          .tile-name {
            color: #78716c;
            margin: 2px 0;
          }
          
          .tile-size {
            color: #a8a29e;
            font-size: 9px;
          }
          
          .price-cell {
            text-align: right;
            font-weight: 600;
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
            border: 1px solid #e8e2db;
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
            background: #faf8f5;
            border: 1px solid #e8e2db;
            border-radius: 4px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: #a8a29e;
            text-align: center;
          }
          
          .summary-section {
            margin-top: 12px;
            text-align: right;
            padding: 0 28px 16px;
          }
          
          .summary-line {
            margin: 5px 0;
            font-size: 12px;
            color: #78716c;
          }
          
          .total-amount {
            font-size: 16px;
            font-weight: 800;
            color: #161B26;
            border-top: 2px solid #F59E0B;
            padding-top: 8px;
            margin-top: 10px;
            letter-spacing: -0.02em;
          }
          
          .footer-notes {
            margin-top: 0;
            font-size: 10px;
            color: #78716c;
            text-align: center;
            background: #161B26;
            padding: 14px 28px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .footer-notes p {
            margin: 3px 0;
            color: rgba(255,255,255,0.6);
          }
          
          .footer-notes .footer-brand {
            color: #F59E0B;
            font-weight: 700;
          }
          
          .wastage-note {
            color: #e11d48;
            font-weight: 700;
          }
        </style>
        ${logoBase64 ? `<link rel="icon" href="${logoBase64}" type="image/svg+xml">` : ''}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              ${logoBase64 ?
        `<img src="${logoBase64}" alt="TYLGO" style="height: 40px; border-radius: 6px; background: rgba(255,255,255,0.95); padding: 3px;">` :
        `<h1 class="company-name">TYL<span class="accent">GO</span></h1>`
      }
              <h2 class="document-type">Quotation</h2>
            </div>
            <div class="header-right">
              <div><strong>${quotation_number}</strong></div>
              <div>${new Date(created_at).toLocaleDateString('en-GB')}</div>
            </div>
          </div>
          
          <div class="meta-info">
            <span>Generated: ${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString('en-US', { hour12: true })}</span>
            <span>Powered by Tylgo</span>
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
            ${wastage_percentage > 0 ? `<p><strong>Wastage:</strong> ${wastage_percentage}%</p>` : ''}
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
                    <th style="width: ${discountPercentage > 0 ? '18%' : '20%'};">Room(s) & Area</th>
                    <th style="width: ${discountPercentage > 0 ? '22%' : '25%'};">Tile Details</th>
                    <th style="width: 8%;">Image</th>
                    <th style="width: ${discountPercentage > 0 ? '10%' : '12%'};">Tiles Required</th>
                    <th style="width: 7%;">Boxes</th>
                    <th style="width: ${discountPercentage > 0 ? '10%' : '12%'};">MRP Price/Box</th>
                    ${discountPercentage > 0 ? `<th style="width: 10%;">Disc. Price/Box</th>` : ''}
                    <th style="width: 13%;">Total Amount</th>
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
              // Determine if this is a wall entry by checking if layers were recorded
              const isWallEntry = layers.length > 0;
              const l = isWallEntry ? (room.wall_length || room.length || 0) : (room.length || 0);
              const w = isWallEntry ? (room.wall_height || room.width || 0) : (room.width || 0);
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
            breakdownHTML += `<br><br><span style="border-top: 1px dashed #ccc; padding-top: 4px; display: block; white-space: nowrap;">Total Area: <strong>${calc.totalArea.toFixed(2)} sq ft</strong></span>`;
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
          })()})</small>${wastage_percentage > 0 ? `<br>
                        <small class="wastage-note">+${wastage_percentage}% wastage</small>` : ''}
                      </td>
                      <td>${calc.boxesNeeded}</td>
                      <td class="price-cell">₹${tile.price_per_box}</td>
                      ${discountPercentage > 0 ? `<td class="price-cell" style="color: #15803d; font-weight: 700;">₹${calc.discountedPricePerBox}</td>` : ''}
                      <td class="price-cell">₹${(discountPercentage > 0 ? calc.discountedTotalPrice : calc.totalPrice).toLocaleString()}</td>
                    </tr>
                  `;
      }).join('')}
                </tbody>  
              </table>
            ` : '<tr><td colspan="7" style="text-align:center; padding: 20px;">No tiles in this quotation</td></tr>'}

            ${productCalculations.length > 0 ? `
            <div style="margin-top: 30px; padding: 0 28px;">
                <h3 style="color: #161B26; font-size: 11px; margin-bottom: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.10em; border-bottom: 2px solid #F59E0B; display: inline-block; padding-bottom: 4px;">Product Selection</h3>
                <table>
                  <thead>
                    <tr>
                      <th style="width: ${discountPercentage > 0 ? '30%' : '35%'};">Product Details</th>
                      <th style="width: 12%;">Code</th>
                      <th style="width: 10%;">Image</th>
                      <th style="width: 10%;">Quantity</th>
                      <th style="width: ${discountPercentage > 0 ? '10%' : '10%'};">MRP Price/Unit</th>
                      ${discountPercentage > 0 ? `<th style="width: 12%;">Disc. Price/Unit</th>` : ''}
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
                          ${discountPercentage > 0 ? `<td class="price-cell" style="color: #15803d; font-weight: 700;">₹${calc.discountedPricePerUnit}</td>` : ''}
                          <td class="price-cell">₹${(discountPercentage > 0 ? calc.discountedTotalPrice : calc.totalPrice).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                  </tbody>
                </table>
            </div>
            ` : ''}
          </div>
          
         <div class="summary-section">
          <div class="summary-line">${totalTileTypes} tile type(s) · ${totalBoxes} boxes total</div>
          <div style="font-size: 12px; margin: 4px 0; color: #44403c;">
            <span>MRP Total:</span>
            <span style="font-weight: 600; margin-left: 6px;">₹${mrp.toLocaleString('en-IN')}</span>
          </div>
          ${discountPercentage > 0 ? `
            <div style="font-size: 12px; margin: 4px 0; color: #15803d;">
              <span>Discount (${discountPercentage}%):</span>
              <span style="font-weight: 600; margin-left: 6px;">-₹${computedDiscountAmount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${roundOffAmount > 0 ? `
            <div style="font-size: 11px; margin: 4px 0; color: #78716c;">
              <span>Round-off:</span>
              <span style="font-weight: 600; margin-left: 6px;">-₹${roundOffAmount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div class="total-amount">
            ${(discountPercentage > 0 || roundOffAmount > 0) ? 'Final Grand Total:' : 'Total Amount:'} ₹${displayTotal.toLocaleString('en-IN')}
          </div>
        </div>

          
          <div class="footer-notes">
            <p class="footer-brand">Thank you for choosing TYLGO</p>
            <p>Valid for 30 days${wastage_percentage > 0 ? ` · Includes ${wastage_percentage}% wastage` : ''} · tylgo.store</p>
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

export const generateTilesHTML = (tiles: TileData[]): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>Tiles Inventory Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      @media print {
        body { margin: 0; }
        .no-print { display: none !important; }
      }

      body {
        font-family: 'Manrope', sans-serif;
        line-height: 1.5;
        color: #1a1f2e;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: #faf8f5;
        letter-spacing: -0.01em;
      }
      
      .container {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      }
      
      .header {
        background: #161B26;
        color: white;
        padding: 20px 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .company-name {
        font-size: 22px;
        font-weight: 800;
        color: white;
        letter-spacing: -0.04em;
      }
      
      .company-name .accent {
        color: #F59E0B;
      }
      
      .report-title {
        font-size: 11px;
        font-weight: 700;
        color: #F59E0B;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      
      .report-info {
        font-size: 13px;
        color: #78716c;
        padding: 16px 28px;
        background: #faf8f5;
        border-bottom: 1px solid #e8e2db;
      }
      
      .report-info p {
        margin: 4px 0;
      }
      
      .report-info strong {
        color: #1a1f2e;
        font-weight: 600;
      }
      
      .table-wrap {
        padding: 0 28px 20px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }
      
      th {
        background: #161B26;
        color: rgba(255,255,255,0.9);
        padding: 10px 8px;
        text-align: left;
        font-weight: 600;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      
      th:first-child { border-radius: 4px 0 0 0; }
      th:last-child { border-radius: 0 4px 0 0; }
      
      td {
        padding: 10px 8px;
        border-bottom: 1px solid #e8e2db;
        vertical-align: top;
        font-size: 13px;
        color: #44403c;
      }
      
      tr:last-child td {
        border-bottom: none;
      }
      
      tr:nth-child(even) {
        background: #faf8f5;
      }
      
      .footer {
        background: #161B26;
        text-align: center;
        font-size: 11px;
        padding: 14px 28px;
      }
      
      .footer p {
        margin: 2px 0;
        color: rgba(255,255,255,0.5);
      }
      
      .footer .brand {
        color: #F59E0B;
        font-weight: 700;
      }
      
      @page {
        size: A4;
        margin: 1cm;
      }
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <div class="company-name">TYL<span class="accent">GO</span></div>
            <div class="report-title">Tiles Inventory Report</div>
          </div>
        </div>
        
        <div class="report-info">
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
          <p><strong>Total Tiles:</strong> ${tiles.length}</p>
        </div>
        
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Category</th>
                <th>Size (mm)</th>
                <th>Price/Box</th>
                <th>Pieces/Box</th>
              </tr>
            </thead>
            <tbody>
              ${tiles.map(tile => `
                <tr>
                  <td><strong style="color: #161B26;">${tile.code}</strong></td>
                  <td>${tile.category || 'N/A'}</td>
                  <td>${tile.size_length} × ${tile.size_breadth}</td>
                  <td>${tile.price_per_box != null ? `₹${tile.price_per_box.toLocaleString('en-IN')}` : 'N/A'}</td>
                  <td>${tile.pieces_per_box || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p class="brand">TYLGO</p>
          <p>Computer-generated report · tylgo.store</p>
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

