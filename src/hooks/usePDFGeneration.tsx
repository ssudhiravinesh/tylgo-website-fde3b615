import { useCallback } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { Quotation } from '@/hooks/useQuotations';
import { formatArea } from '@/utils/unitConversions';

interface TileCalculation {
  tile: any;
  rooms: any[];
  totalArea: number;
  rawTilesNeeded: number;
  tilesNeeded: number;
  boxesNeeded: number;
  totalPrice: number;
}

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
          tile:tiles(name,code,price_per_box,pieces_per_box,size_length,size_breadth)
        `)
        .eq('quotation_id', quotation.id);

      if (error) {
        throw new Error(`Failed to fetch quotation items: ${error.message}`);
      }

      // Group items by tile for calculations
      const tileCalculations: { [tileId: string]: TileCalculation } = {};

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
              boxesNeeded: 0,
              totalPrice: 0,
            };
          }

          const calc = tileCalculations[tileId];
          calc.rooms.push({ ...group.room, layers: [...group.layers].sort(), totalArea: group.totalArea });
          calc.totalArea += group.totalArea;
          calc.totalPrice += group.totalPrice;
        });

        // Calculate tiles and boxes per tile type
        Object.values(tileCalculations).forEach((calc) => {
          const tile = calc.tile;
          if (!tile?.size_length || !tile.size_breadth || !tile.pieces_per_box) return;

          const tileAreaSqFt = (tile.size_length / 304.8) * (tile.size_breadth / 304.8);
          if (!tileAreaSqFt) return;

          const basicTiles = Math.ceil(calc.totalArea / tileAreaSqFt);
          calc.rawTilesNeeded = basicTiles;
          calc.tilesNeeded = Math.ceil(basicTiles * (1 + wastagePercentage / 100));

          const piecesPerBox = Number(tile.pieces_per_box);
          calc.boxesNeeded = Math.ceil(calc.tilesNeeded / piecesPerBox);
        });
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Set font
      pdf.setFont('helvetica');
      
      // Header
      pdf.setFontSize(20);
      pdf.text('TYLGO', 105, 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text('QUOTATION', 105, 30, { align: 'center' });

      // Customer and Quotation Details (Two columns)
      pdf.setFontSize(11);
      let yPos = 45;

      // Customer Details
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer Details', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 7;

      pdf.text(`Name: ${quotation.customer?.name || 'N/A'}`, 20, yPos);
      yPos += 5;
      pdf.text(`Mobile: ${quotation.customer?.mobile || 'N/A'}`, 20, yPos);
      yPos += 5;

      const customer: any = quotation.customer || {};
      const address = [customer.address, customer.area, customer.state, customer.pincode]
        .filter(Boolean)
        .join(', ');
      if (address) {
        pdf.text(`Address: ${address}`, 20, yPos);
        yPos += 5;
      }

      // Quotation Details (right column)
      let rightYPos = 45;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Quotation Details', 120, rightYPos);
      pdf.setFont('helvetica', 'normal');
      rightYPos += 7;

      pdf.text(`Quotation #: ${quotation.quotation_number}`, 120, rightYPos);
      rightYPos += 5;
      pdf.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, 120, rightYPos);
      rightYPos += 5;
      pdf.text(`Status: ${quotation.status.toUpperCase()}`, 120, rightYPos);
      rightYPos += 5;
      pdf.text(`Created by: ${quotation.worker?.name || 'N/A'}`, 120, rightYPos);
      rightYPos += 5;
      pdf.text(`Wastage: ${wastagePercentage}%`, 120, rightYPos);

      yPos = Math.max(yPos, rightYPos) + 10;

      // Prepare table data
      const tableBody = [];
      let totalBoxes = 0;
      let grandTotal = 0;

      if (Object.keys(tileCalculations).length > 0) {
        Object.entries(tileCalculations).forEach(([tileId, calc]) => {
          const tile = calc.tile;
          totalBoxes += calc.boxesNeeded;
          grandTotal += calc.totalPrice;

          // Format tile dimensions
          const dims =
            tile.size_length >= 1000 || tile.size_breadth >= 1000
              ? `${(tile.size_length / 1000).toFixed(2)} × ${(tile.size_breadth / 1000).toFixed(2)} m`
              : tile.size_length >= 100 || tile.size_breadth >= 100
              ? `${(tile.size_length / 10).toFixed(1)} × ${(tile.size_breadth / 10).toFixed(1)} cm`
              : `${tile.size_length} × ${tile.size_breadth} mm`;

          // Format room display
          const roomDisplay = calc.rooms
            .map((room: any) =>
              `${room.name}${
                room.layers?.length > 1
                  ? ` (Layers: ${room.layers.join(', ')})`
                  : room.layers?.[0] > 1
                  ? ` (Layer ${room.layers[0]})`
                  : ''
              }`
            )
            .join(', ');

          // Tile details
          const tileDetails = [
            `Code: ${tile.code || 'N/A'}`,
            `${tile.name || 'Unknown Tile'}`,
            `Size: ${dims}`,
            tile.pieces_per_box ? `${tile.pieces_per_box} pcs/box` : ''
          ].filter(Boolean).join('\n');

          tableBody.push([
            `${roomDisplay}\nTotal Area: ${formatArea(calc.totalArea)}`,
            tileDetails,
            `${calc.rawTilesNeeded}\n+${wastagePercentage}% wastage`,
            calc.boxesNeeded,
            tile.price_per_box ? `₹${parseFloat(String(tile.price_per_box)).toLocaleString('en-IN')}` : 'N/A',
            `₹${calc.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          ]);
        });
      } else {
        tableBody.push([
          { content: 'No items found in this quotation', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic' } }
        ]);
      }

      // Create table using autoTable
      (pdf as any).autoTable({
        startY: yPos,
        head: [['Room(s) & Area', 'Tile Details', 'Tiles Required', 'Boxes', 'Price/Box', 'Total Amount']],
        body: tableBody,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineWidth: 0,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fontStyle: 'bold',
          fontSize: 9,
          fillColor: false,
          textColor: [0, 0, 0],
          lineWidth: 0,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 45 },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 20, right: 20 },
      });

      // Summary
      const finalY = (pdf as any).lastAutoTable.finalY + 10;
      pdf.setFontSize(10);
      
      const summaryText = `Summary: ${Object.keys(tileCalculations).length} tile type(s) | ${totalBoxes} boxes total`;
      pdf.text(summaryText, 190, finalY, { align: 'right' });
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(`Total Amount: ₹${grandTotal.toLocaleString('en-IN')}`, 190, finalY + 8, { align: 'right' });

      // Notes (if any)
      let notesY = finalY + 20;
      if (quotation.notes) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('Additional Notes', 20, notesY);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        const noteLines = pdf.splitTextToSize(quotation.notes, 170);
        pdf.text(noteLines, 20, notesY + 5);
        notesY += 5 + (noteLines.length * 4);
      }

      // Footer
      const footerY = Math.max(notesY + 10, 250);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Thank you for choosing TYLGO!', 105, footerY, { align: 'center' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('This quotation is valid for 30 days from the date of issue.', 105, footerY + 5, { align: 'center' });
      pdf.text(`Note: All tile quantities include a ${wastagePercentage}% wastage allowance.`, 105, footerY + 10, { align: 'center' });
      pdf.text('All calculations are based on square feet measurements for accuracy.', 105, footerY + 15, { align: 'center' });

      // Save PDF
      pdf.save(`Quotation-${quotation.quotation_number}.pdf`);
      toast.success('PDF downloaded successfully');

    } catch (error: any) {
      toast.error('Failed to generate PDF. Please try again.');
    }
  }, []);

  return { generateQuotationPDF };
};
