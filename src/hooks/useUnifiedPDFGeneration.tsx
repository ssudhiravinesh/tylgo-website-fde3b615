import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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

  // === IMAGE PROXY LOADER ===
  const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
      if (!url) return null;
      // Use proxy to avoid CORS blocks
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Proxy fetch failed');
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Proxy image load failed', error);
      return null;
    }
  };

  // Get direct public URL for Supabase images
  const getDirectImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageUrl === 'undefined') return '';
    if (imageUrl.startsWith('http')) return imageUrl;

    try {
      let filePath = '';
      if (imageUrl.includes('/storage/v1/object/sign/tile-images/')) {
        const parts = imageUrl.split('/storage/v1/object/sign/tile-images/');
        if (parts.length === 2) filePath = parts[1].split('?')[0];
      } else if (imageUrl.includes('tile-images/')) {
        const parts = imageUrl.split('tile-images/');
        if (parts.length === 2) filePath = parts[1].split('?')[0];
      }
      
      if (filePath) {
        const { data } = supabase.storage.from('tile-images').getPublicUrl(filePath);
        return data.publicUrl;
      }
    } catch (error) {
      console.warn(`[PDF Generation] Error processing URL ${imageUrl}:`, error);
    }
    return imageUrl;
  };

  const generateQuotationHTML = async (quotation: Quotation): Promise<string> => {
    const { 
      quotation_items = [], customer, worker, quotation_number, created_at, 
      wastage_percentage = 0, discount_percentage = 0, discount_amount = 0
    } = quotation;

    // --- Calculation Logic ---
    const tileCalculations: { [tileId: string]: any } = {};
    quotation_items.forEach((item: any) => {
      const tileId = item.tile_id;
      if (!tileCalculations[tileId] && item.tile) {
        tileCalculations[tileId] = {
          tile: item.tile, rooms: [], totalArea: 0, tilesNeeded: 0, 
          boxesNeeded: 0, totalPrice: 0, customBoxAdjustment: item.custom_boxes || 0
        };
      }
      if (item.room && tileCalculations[tileId]) {
        const roomAreaInSqFt = parseFloat(item.area?.toString()) || 0;
        tileCalculations[tileId].rooms.push({
          name: item.room.name, area: roomAreaInSqFt, layerNumber: item.layer_number
        });
        tileCalculations[tileId].totalArea += roomAreaInSqFt;
      }
    });

    // Process Images
    await Promise.all(
      Object.entries(tileCalculations).map(async ([tileId, calc]) => {
        const directUrl = getDirectImageUrl(calc.tile.image_url);
        if (!directUrl) {
          tileCalculations[tileId].tile_image_src = null;
          return;
        }
        const base64Data = await urlToBase64(directUrl);
        tileCalculations[tileId].tile_image_src = base64Data || directUrl;
      })
    );

    // Calculate Totals
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
    const mrp = calculations.reduce((sum: number, calc: any) => sum + calc.totalPrice, 0);
    const finalTotal = mrp - discount_amount;

    const formatTileSize = (sizeLength?: number, sizeBreadth?: number) => {
      if (!sizeLength || !sizeBreadth) return 'N/A';
      const lengthInMm = sizeLength;
      const widthInMm = sizeBreadth;
      if (lengthInMm >= 1000 || widthInMm >= 1000) {
        return `${(lengthInMm / 1000).toFixed(1)} × ${(widthInMm / 1000).toFixed(1)} m`;
      } else if (lengthInMm >= 100 || widthInMm >= 100) {
        return `${(lengthInMm / 10).toFixed(0)} × ${(widthInMm / 10).toFixed(0)} cm`;
      } else {
        return `${lengthInMm} × ${widthInMm} mm`;
      }
    };

    const styles = `
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.4; color: #000; margin: 0; padding: 20px; background: white; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; margin: 0; }
        .document-type { font-size: 16px; color: #666; margin: 5px 0 0 0; font-weight: normal; }
        .meta-info { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-bottom: 15px; }
        .details-section { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 20px; }
        .details-box { flex: 1; }
        .details-box h3 { color: #2563eb; font-size: 14px; margin: 0 0 10px 0; font-weight: bold; }
        .details-box p { margin: 3px 0; font-size: 12px; }
        .table-container { margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
        th { background-color: #f8f9fa; border: 1px solid #ddd; padding: 8px 6px; text-align: center; font-weight: bold; font-size: 10px; }
        td { border: 1px solid #ddd; padding: 6px; text-align: center; vertical-align: top; }
        .room-cell, .tile-details { text-align: left; font-size: 10px; }
        .tile-code { font-weight: bold; color: #000; }
        .price-cell { text-align: right; font-weight: bold; }
        .image-cell { padding: 4px; width: 60px; }
        .tile-image { width: 50px; height: 50px; object-fit: contain; display: block; margin: 0 auto; }
        .summary-section { margin-top: 15px; text-align: right; }
        .total-amount { font-size: 16px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 5px; margin-top: 10px; }
        .footer-notes { margin-top: 30px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }
        .page-break { page-break-inside: avoid; }
      </style>
    `;

    // HTML Construction (Same as before)
    return `
      <div class="container">
        ${styles}
        <div class="header">
          <h1 class="company-name">TYLGO</h1>
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
            ${discount_percentage > 0 ? `<p><strong>Discount:</strong> ${discount_percentage}%</p>` : ''}
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Room(s) & Area</th>
                <th style="width: 25%;">Tile Details</th>
                <th style="width: 10%;">Image</th>
                <th style="width: 10%;">Required</th>
                <th style="width: 10%;">Boxes</th>
                <th style="width: 10%;">Price/Box</th>
                <th style="width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${calculations.map((calc: any) => {
                const tile = calc.tile;
                return `
                  <tr class="page-break">
                    <td class="room-cell">
                      ${(() => {
                        const roomGroups: { [roomName: string]: { room: any, layers: number[] } } = {};
                        calc.rooms.forEach((room: any) => {
                          const roomKey = room.name;
                          if (!roomGroups[roomKey]) roomGroups[roomKey] = { room, layers: [] };
                          if (room.layerNumber !== null && room.layerNumber !== undefined) {
                            roomGroups[roomKey].layers.push(room.layerNumber);
                          }
                        });
                        return Object.values(roomGroups).map(({ room, layers }) => {
                          let roomDisplay = `<strong>${room.name}`;
                          if (layers.length > 0) roomDisplay += ` (L${layers.sort((a, b) => a - b).join(', ')})`;
                          roomDisplay += '</strong>';
                          return roomDisplay;
                        }).join('<br>');
                      })()}
                      <br>Area: ${calc.totalArea.toFixed(0)} sq ft
                    </td>
                    <td class="tile-details">
                      <div class="tile-code"><strong>${tile.code}</strong></div>
                      <div class="tile-name">${tile.name}</div>
                      <div class="tile-size">${formatTileSize(tile.size_length, tile.size_breadth)}</div>
                    </td>
                    <td class="image-cell">
                      ${calc.tile_image_src ? `<img src="${calc.tile_image_src}" class="tile-image" alt="Tile" />` : `<span style="font-size:9px;color:#999;">No Image</span>`}
                    </td>
                    <td>
                      ${calc.tilesNeeded}<br>
                      <small style="color:#e11d48;font-size:9px;">+${wastage_percentage}%</small>
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
        <div class="summary-section page-break">
          <div class="summary-row">
            <span class="summary-label">MRP:</span>
            <span class="summary-value">₹${mrp.toLocaleString('en-IN')}</span>
          </div>
          ${discount_percentage > 0 ? `
            <div class="summary-row discount-row">
              <span class="summary-label">Discount (${discount_percentage}%):</span>
              <span class="summary-value">-₹${discount_amount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div class="total-amount">Total: ₹${finalTotal.toLocaleString('en-IN')}</div>
        </div>
        <div class="footer-notes page-break">
          <p><strong>Thank you for choosing Tile Solutions!</strong></p>
          <p>This quotation is valid for 30 days from the date of issue.</p>
        </div>
      </div>
    `;
  };

  const generateTilesHTML = async (tiles: TileData[]): Promise<string> => {
    const tilesWithImages = await Promise.all(tiles.map(async (tile) => {
      const directUrl = getDirectImageUrl(tile.image_url);
      let base64Data = null;
      if (directUrl) base64Data = await urlToBase64(directUrl);
      return { ...tile, imageSrc: base64Data || directUrl };
    }));

    const styles = `
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #000; padding: 20px; background: white; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .report-title { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
        .report-info { font-size: 12px; color: #6b7280; margin-bottom: 20px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb; padding: 10px; text-align: left; font-weight: bold; }
        td { border-bottom: 1px solid #e5e7eb; padding: 10px; vertical-align: middle; }
        .tile-image { width: 40px; height: 40px; object-fit: contain; border: 1px solid #eee; border-radius: 4px; }
        .page-break { page-break-inside: avoid; }
      </style>
    `;

    return `
      <div class="container">
        ${styles}
        <div class="header">
          <h1 class="report-title">Tiles Inventory Report</h1>
          <div class="report-info">
            Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}
            <br/>Total Tiles: ${tiles.length}
          </div>
        </div>
        <table>
          <thead>
            <tr><th width="15%">Image</th><th width="20%">Code</th><th width="25%">Name</th><th width="15%">Category</th><th width="15%">Size</th><th width="10%">Price</th></tr>
          </thead>
          <tbody>
            ${tilesWithImages.map(tile => `
              <tr class="page-break">
                <td>${tile.imageSrc ? `<img src="${tile.imageSrc}" class="tile-image" />` : '-'}</td>
                <td><strong>${tile.code}</strong></td>
                <td>${tile.name}</td>
                <td>${tile.category || 'N/A'}</td>
                <td>${tile.size_length} × ${tile.size_breadth}</td>
                <td>₹${tile.price_per_box || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    setIsGenerating(true);
    try {
      toast.info('Generating PDF...');
      const htmlContent = await generateQuotationHTML(quotation);
      
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      
      // === FIX FOR BLANK PDF ===
      // Position element at 0,0 but hide it BEHIND the app using z-index
      container.style.position = 'absolute';
      container.style.left = '0px';
      container.style.top = '0px';
      container.style.zIndex = '-9999';
      container.style.width = '800px'; 
      container.style.backgroundColor = 'white'; // Force white background
      document.body.appendChild(container);

      const options = {
        margin: [10, 10, 10, 10], 
        filename: `Quotation-${quotation.quotation_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          allowTaint: true, 
          logging: false,
          scrollY: 0 // Force scroll to top
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(options).from(container).save();

      // Small delay before cleanup to ensure capture is done
      setTimeout(() => {
        if (document.body.contains(container)) document.body.removeChild(container);
      }, 500);
      
      toast.success('PDF downloaded successfully!');

    } catch (error: any) {
      console.error('[PDF Generation] Error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateTilesPDF = useCallback(async (tiles: TileData[]) => {
    setIsGenerating(true);
    try {
      toast.info('Generating Inventory Report...');
      const htmlContent = await generateTilesHTML(tiles);

      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      
      // === FIX FOR BLANK PDF ===
      container.style.position = 'absolute';
      container.style.left = '0px';
      container.style.top = '0px';
      container.style.zIndex = '-9999';
      container.style.width = '800px';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      const options = {
        margin: [10, 10, 10, 10],
        filename: `Tiles_Inventory_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(options).from(container).save();

      setTimeout(() => {
        if (document.body.contains(container)) document.body.removeChild(container);
      }, 500);
      
      toast.success('Inventory Report downloaded successfully!');
    } catch (error: any) {
      console.error('Error generating tiles PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateQuotationPDF, generateTilesPDF, isGenerating };
};

export const useServerPDFGeneration = useUnifiedPDFGeneration;
