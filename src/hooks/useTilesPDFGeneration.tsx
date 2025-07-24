import { useCallback } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Tile } from '@/hooks/useTiles';

export const useTilesPDFGeneration = () => {
  const generateTilesPDF = useCallback(async (tiles: Tile[]) => {
      console.log('generateTilesPDF called with', tiles.length, 'tiles');
    try {
      console.log('Starting PDF generation process...');
      // Generate table rows for PDF
      const itemsRows = tiles
        .map((tile, index) => {
          const dims = tile.size_length >= 1000 || tile.size_breadth >= 1000
            ? `${(tile.size_length / 1000).toFixed(2)} × ${(tile.size_breadth / 1000).toFixed(2)} m`
            : tile.size_length >= 100 || tile.size_breadth >= 100
              ? `${(tile.size_length / 10).toFixed(1)} × ${(tile.size_breadth / 10).toFixed(1)} cm`
              : `${tile.size_length} × ${tile.size_breadth} mm`;

          const priceDisplay = tile.price_per_box 
            ? `₹${parseFloat(String(tile.price_per_box)).toLocaleString('en-IN')}`
            : 'N/A';

          return `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;font-size:12px;text-align:center;">
                ${index + 1}
              </td>
              <td style="padding:8px;border:1px solid #ddd;font-size:12px;">
                <strong>${tile.code || 'N/A'}</strong>
              </td>
              <td style="padding:8px;border:1px solid #ddd;font-size:12px;">
                ${tile.name || 'Unknown Tile'}
              </td>
              <td style="padding:8px;border:1px solid #ddd;font-size:12px;">
                ${tile.category || 'General'}
              </td>
              <td style="padding:8px;border:1px solid #ddd;font-size:12px;text-align:center;">
                ${dims}
              </td>
              <td style="padding:8px;border:1px solid #ddd;font-size:12px;text-align:right;">
                ${priceDisplay}
                ${tile.pieces_per_box ? `<br/><small style="color:#666;">(${tile.pieces_per_box} pcs/box)</small>` : ''}
              </td>
            </tr>
          `;
        })
        .join('');

      // Final HTML for rendering
      const pdfHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:20px;font-size:14px;color:#333;background:#fff;}
            .header{text-align:center;margin-bottom:30px;border-bottom:3px solid #007bff;padding-bottom:20px;}
            .company-name{font-size:42px;font-weight:bold;color:#007bff;margin-bottom:10px;letter-spacing:2px;}
            .orange-g{color:#ff8c00;font-weight:bold;}
            .report-title{font-size:24px;color:#555;font-weight:600;margin-top:5px;}
            .meta-info{text-align:center;margin-bottom:25px;font-size:14px;color:#666;background:#f8f9fa;padding:15px;border-radius:8px;}
            table{width:100%;border-collapse:collapse;font-size:12px;margin-top:15px;box-shadow:0 2px 4px rgba(0,0,0,0.1);}
            th,td{border:1px solid #ddd;padding:12px 8px;vertical-align:top;}
            th{background:#f8f9fa;font-weight:bold;font-size:11px;text-align:left;color:#333;}
            tr:nth-child(even){background:#fdfdfd;}
            tr:hover{background:#f0f8ff;}
            .summary{margin-top:20px;text-align:center;font-size:16px;color:#007bff;font-weight:600;background:#e3f2fd;padding:15px;border-radius:8px;}
            .footer{text-align:center;margin-top:25px;font-size:10px;color:#666;border-top:1px solid #ddd;padding-top:15px;}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">TYL<span class="orange-g">G</span>O</div>
            <div class="report-title">TILES INVENTORY REPORT</div>
          </div>
          <div class="meta-info">
            <div>Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</div>
            <div>Total Tiles: ${tiles.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:8%;text-align:center;">S.No.</th>
                <th style="width:15%;">Code</th>
                <th style="width:25%;">Name</th>
                <th style="width:15%;">Category</th>
                <th style="width:20%;text-align:center;">Size</th>
                <th style="width:17%;text-align:right;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div class="summary">
            <strong>Total Tiles in Inventory: ${tiles.length}</strong>
          </div>
          <div class="footer">
            <p><strong>TYLGO Tiles Inventory Management System</strong></p>
            <p>This report contains all tiles currently available in the system.</p>
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

      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`Tiles-Inventory-${timestamp}.pdf`);
      toast.success('Tiles inventory PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error generating tiles PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateTilesPDF };
};