import { useCallback } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';
import { formatArea } from '@/utils/unitConversions';
import type { TileCalculationResult } from '@/utils/tileCalculations';

export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation) => {
    try {
      const wastagePercentage = quotation.wastage_percentage ?? 0;

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
        throw new Error(`Failed to fetch quotation items: ${error.message}`);
      }

      // Group items by tile using unified calculation system
      const tileCalculations: { [tileId: string]: TileCalculationResult & { rooms: any[], quotationItems: any[] } } = {};

      if (quotationItems && quotationItems.length > 0) {
        // Group items by tile_id and room_id to handle layers correctly
        const tileRoomGroups = new Map<string, any>();

        quotationItems.forEach((item: any) => {
          const groupKey = `${item.tile_id}-${item.room_id}`;
          if (!tileRoomGroups.has(groupKey)) {
            tileRoomGroups.set(groupKey, {
              tile: item.tile,
              room: item.room,
              layers: [] as number[],
              baseArea: parseFloat(item.area) || 0,
              customBoxes: 0,
              totalPrice: 0,
            });
          }
          const group = tileRoomGroups.get(groupKey);
          if (!group.layers.includes(item.layer_number)) group.layers.push(item.layer_number);
          group.customBoxes += item.custom_boxes || 0;
          group.totalPrice += parseFloat(item.total_price) || 0;
        });

        // Calculate totals per tile
        tileRoomGroups.forEach((group, groupKey) => {
          const tileId = groupKey.split('-')[0];
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
              quotationItems: [],
            };
          }

          const calc = tileCalculations[tileId];
          calc.rooms.push({ ...group.room, layers: [...group.layers].sort(), totalArea: group.totalArea });
          calc.totalArea += group.totalArea;
          calc.totalPrice += group.totalPrice;
          calc.quotationItems.push({ custom_boxes: group.customBoxes });
        });

        // Calculate tiles, boxes, and other metrics per tile type
        Object.values(tileCalculations).forEach((calc) => {
          const tile = calc.tile;
          if (!tile?.size_length || !tile.size_breadth || !tile.pieces_per_box) return;

          const tileAreaSqFt = (tile.size_length / 304.8) * (tile.size_breadth / 304.8);
          if (!tileAreaSqFt) return;

          const basicTiles = Math.ceil(calc.totalArea / tileAreaSqFt);
          calc.rawTilesNeeded = basicTiles;
          calc.tilesNeeded = Math.ceil(basicTiles * (1 + wastagePercentage / 100));

          const piecesPerBox = Number(tile.pieces_per_box);
          calc.fullBoxes = Math.floor(basicTiles / piecesPerBox);
          calc.leftoverTiles = basicTiles % piecesPerBox;

          const customAdj = calc.quotationItems.reduce((sum, qi) => sum + (qi.custom_boxes || 0), 0);
          const baseBoxes = Math.ceil(calc.tilesNeeded / piecesPerBox);
          calc.boxesNeeded = Math.max(0, baseBoxes + customAdj);
        });
      }

      // Generate table rows for PDF
      let itemsRows = '';
      let totalBoxes = 0;
      let grandTotal = 0;

      if (Object.keys(tileCalculations).length) {
        itemsRows = Object.entries(tileCalculations)
          .map(([tileId, calc]) => {
            const tile = calc.tile;
            totalBoxes += calc.boxesNeeded;
            grandTotal += calc.totalPrice;

            const dims =
              tile.size_length >= 1000 || tile.size_breadth >= 1000
                ? `${(tile.size_length / 1000).toFixed(2)} × ${(tile.size_breadth / 1000).toFixed(2)} m`
                : tile.size_length >= 100 || tile.size_breadth >= 100
                  ? `${(tile.size_length / 10).toFixed(1)} × ${(tile.size_breadth / 10).toFixed(1)} cm`
                  : `${tile.size_length} × ${tile.size_breadth} mm`;

            const roomDisplay = calc.rooms
              .map(
                (room) =>
                  `${room.name}${
                    room.layers.length > 1
                      ? ` (Layers: ${room.layers.join(', ')})`
                      : room.layers[0] > 1
                      ? ` (Layer ${room.layers[0]})`
                      : ''
                  }`
              )
              .join(', ');

            const boxPricing = tile.price_per_box
              ? `<small style="color:#666;font-size:10px;">₹${parseFloat(String(tile.price_per_box)).toLocaleString('en-IN')} per box (${tile.pieces_per_box} pcs)</small><br/>`
              : '';

            const imageCell = tile.image_url
              ? `<img src="${tile.image_url}" alt="${tile.name || 'Tile'}" style="max-width:80px;max-height:60px;object-fit:contain;" onerror="this.style.display='none';" />`
              : '<small style="color:#999;font-style:italic;">No image</small>';

            return `
              <tr>
                <td style="padding:8px;border:1px solid #ddd;font-size:12px;">
                  <strong>${roomDisplay}</strong><br/>
                  <small style="color:#666;">Total Area: ${formatArea(calc.totalArea)}</small>
                </td>
                <td style="padding:8px;border:1px solid #ddd;font-size:12px;">
                  <strong>Code: ${tile.code || 'N/A'}</strong><br/>
                  <small style="color:#666;">${tile.name || 'Unknown Tile'}</small><br/>
                  <small style="color:#666;">Size: ${dims}</small><br/>
                  ${boxPricing}
                </td>
                <td style="text-align:center;padding:8px;border:1px solid #ddd;">
                  ${imageCell}
                </td>
                <td style="text-align:center;padding:8px;border:1px solid #ddd;font-size:12px;">
                  ${calc.rawTilesNeeded}<br/>
                  <small style="color:#666;">+${wastagePercentage}% wastage</small>
                </td>
                <td style="text-align:right;padding:8px;border:1px solid #ddd;font-size:12px;">
                  ${calc.boxesNeeded}
                </td>
                <td style="text-align:center;padding:8px;border:1px solid #ddd;font-size:12px;">
                  ₹${tile.price_per_box ? parseFloat(String(tile.price_per_box)).toLocaleString('en-IN') : 'N/A'}
                </td>
                <td style="text-align:right;padding:8px;border:1px solid #ddd;font-weight:bold;font-size:12px;">
                  ₹${calc.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            `;
          })
          .join('');
      } else {
        itemsRows =
          '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;font-style:italic;">No items found in this quotation</td></tr>';
      }

      // Final HTML for rendering
      const pdfHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:20px;font-size:14px;color:#333;}
            .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #007bff;padding-bottom:10px;}
            .company-name{font-size:36px;font-weight:bold;color:#007bff;}
            .orange-g{color:#ff8c00;}
            .quotation-title{font-size:20px;color:#555;}
            .details{display:flex;justify-content:space-between;margin-bottom:20px;}
            .section{width:48%;}
            .section-title{font-size:16px;font-weight:bold;margin-bottom:8px;color:#007bff;border-bottom:1px solid #ddd;padding-bottom:4px;}
            .info{margin-bottom:6px;font-size:12px;}
            .label{font-weight:bold;color:#555;width:90px;display:inline-block;}
            table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;}
            th,td{border:1px solid #ddd;padding:8px;vertical-align:top;}
            th{background:#f8f9fa;font-weight:bold;font-size:10px;text-align:left;}
            tr:nth-child(even){background:#f9f9f9;}
            .summary{margin-top:15px;text-align:right;font-size:12px;}
            .total{font-size:14px;font-weight:bold;color:#007bff;border-top:2px solid #007bff;padding-top:6px;}
            .footer{text-align:center;margin-top:20px;font-size:9px;color:#666;border-top:1px solid #ddd;padding-top:8px;}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">TYL<span class="orange-g">G</span>O</div>
            <div class="quotation-title">QUOTATION</div>
          </div>
          <div class="details">
            <div class="section">
              <div class="section-title">Customer Details</div>
              <div class="info"><span class="label">Name:</span> ${quotation.customer?.name || 'N/A'}</div>
              <div class="info"><span class="label">Mobile:</span> ${quotation.customer?.mobile || 'N/A'}</div>
              ${
                (() => {
                  const c: any = quotation.customer || {};
                  const addr = [c.address, c.area, c.state, c.pincode].filter(Boolean).join(', ');
                  return addr ? `<div class="info"><span class="label">Address:</span> ${addr}</div>` : '';
                })()
              }
            </div>
            <div class="section">
              <div class="section-title">Quotation Details</div>
              <div class="info"><span class="label">Quotation #:</span> ${quotation.quotation_number}</div>
              <div class="info"><span class="label">Date:</span> ${new Date(quotation.created_at).toLocaleDateString()}</div>
              <div class="info"><span class="label">Status:</span> ${quotation.status.toUpperCase()}</div>
              <div class="info"><span class="label">Created by:</span> ${quotation.worker?.name || 'N/A'}</div>
              <div class="info"><span class="label">Wastage:</span> ${wastagePercentage}%</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:22%;">Room(s) & Area</th>
                <th style="width:22%;">Tile Details</th>
                <th style="width:8%;text-align:center;">Image</th>
                <th style="width:16%;text-align:center;">Tiles Required</th>
                <th style="width:10%;text-align:center;">Boxes</th>
                <th style="width:10%;text-align:center;">Price/Box</th>
                <th style="width:12%;text-align:right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div class="summary">
            <div><strong>Summary:</strong> ${Object.keys(tileCalculations).length} tile type(s) | ${totalBoxes} boxes total</div>
            <div class="total">Total Amount: ₹${grandTotal.toLocaleString('en-IN')}</div>
          </div>
          ${
            quotation.notes
              ? `<div style="margin-top:15px;padding:8px;background:#fff9c4;border-left:3px solid #ffc107;">
                   <div style="font-size:12px;font-weight:bold;color:#007bff;margin-bottom:4px;">Additional Notes</div>
                   <p style="margin:0;font-size:10px;">${quotation.notes}</p>
                 </div>`
              : ''
          }
          <div class="footer">
            <p><strong>Thank you for choosing TYLGO!</strong></p>
            <p>This quotation is valid for 30 days from the date of issue.</p>
            <p><strong>Note:</strong> All tile quantities include a ${wastagePercentage}% wastage allowance.</p>
            <p>All calculations are based on square feet measurements for accuracy.</p>
          </div>
        </body>
        </html>
      `;

      // Render to off-screen container
      const container = document.createElement('div');
      container.innerHTML = pdfHTML;
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.width = '794px'; // 96 DPI ≈ 794 px for A4 width
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: container.scrollHeight,
      });

      document.body.removeChild(container);

      // Create PDF, split into pages if needed
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pxPerMm = 3.78; // at 96 DPI
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const usableHeight = pageHeight - margin * 2;
      const totalPages = Math.ceil(canvas.height / (usableHeight * pxPerMm));

      for (let i = 0; i < totalPages; i++) {
        if (i) pdf.addPage();
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = Math.min(canvas.height - i * usableHeight * pxPerMm, usableHeight * pxPerMm);

        const ctx = slice.getContext('2d')!;
        ctx.drawImage(
          canvas,
          0,
          i * usableHeight * pxPerMm,
          canvas.width,
          slice.height,
          0,
          0,
          canvas.width,
          slice.height,
        );

        const imgData = slice.toDataURL('image/png');
        const imgHeightMm = slice.height / pxPerMm;
        pdf.addImage(imgData, 'PNG', margin, margin, pageWidth - margin * 2, imgHeightMm);
      }

      pdf.save(`Quotation-${quotation.quotation_number}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateQuotationPDF };
};
