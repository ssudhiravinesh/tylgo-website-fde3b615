import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
}

/* ---------- small helpers ---------- */
const supabaseUrl = 'https://onucizagpgwdpcakskat.supabase.co';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* Produce AutoTable rows from Quotation line-items */
const quotationRows = (quotation: Quotation) =>
  (quotation.quotation_items || []).map((item) => ({
    room: item.room?.name || 'N/A',
    tileCode: item.tile?.code || 'N/A',
    size: item.tile ? `${item.tile.size_length} × ${item.tile.size_breadth}` : 'N/A',
    boxes: Math.ceil(item.area / ((item.tile?.size_length || 1) * (item.tile?.size_breadth || 1) / 10000) / (item.tile?.pieces_per_box || 1)),
    pricePerBox: `₹${item.price_per_box?.toLocaleString('en-IN') ?? '0'}`,
    total: `₹${item.total_price.toLocaleString('en-IN')}`,
  }));

export const useUnifiedPDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  /* ---------- 1.  QUOTATION PDF ---------- */
  const generateQuotationPDF = useCallback(
    async (quotation: Quotation) => {
      setIsGenerating(true);
      try {
        /* ---------- try serverless first ---------- */
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(
          `${supabaseUrl}/functions/v1/generate-quotation-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session?.access_token || ''}`,
            },
            body: JSON.stringify({ quotation }),
          }
        );

        const pdfFailed = res.headers.get('X-PDF-Generation-Failed');
        const contentType = res.headers.get('content-type') || '';

        /* ---------- fall back to client-side jsPDF ---------- */
        if (pdfFailed && contentType.includes('text/html')) {
          console.warn(
            'Server-side quotation PDF failed – using client fallback'
          );
          const pdf = new jsPDF('p', 'mm', 'a4');

          // Title block
          pdf.setFontSize(18).setFont('helvetica', 'bold');
          pdf.text('QUOTATION', 105, 25, { align: 'center' });
          
          pdf.setFontSize(12).setFont('helvetica', 'normal');
          pdf.text(`Quotation No: ${quotation.quotation_number}`, 20, 40);
          pdf.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('en-IN')}`, 20, 48);
          
          // Customer details
          pdf.setFontSize(11).setFont('helvetica', 'bold');
          pdf.text('Bill To:', 20, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${quotation.customer?.name || 'N/A'}`, 20, 68);
          pdf.text(`Mobile: ${quotation.customer?.mobile || 'N/A'}`, 20, 76);
          if (quotation.customer?.address) {
            pdf.text(`Address: ${quotation.customer.address}`, 20, 84);
          }

          // Table
          const tableData = quotationRows(quotation);
          
          autoTable(pdf, {
            startY: 95,
            head: [
              [
                'Room',
                'Tile Code',
                'Size (cm)',
                'Boxes',
                'Price/Box',
                'Total',
              ],
            ],
            body: tableData.map(row => [
              row.room,
              row.tileCode,
              row.size,
              row.boxes.toString(),
              row.pricePerBox,
              row.total
            ]),
            theme: 'grid',
            headStyles: { 
              fillColor: [52, 118, 235],
              textColor: [255, 255, 255],
              fontSize: 10,
              fontStyle: 'bold'
            },
            styles: { 
              cellPadding: 3, 
              fontSize: 9,
              lineColor: [128, 128, 128],
              lineWidth: 0.1
            },
            columnStyles: {
              0: { cellWidth: 35 }, // Room
              1: { cellWidth: 25 }, // Tile Code
              2: { cellWidth: 25 }, // Size
              3: { halign: 'center', cellWidth: 20 }, // Boxes
              4: { halign: 'right', cellWidth: 25 }, // Price/Box
              5: { halign: 'right', cellWidth: 30 }, // Total
            },
            margin: { left: 20, right: 20 },
            didDrawPage: (data) => {
              const doc = data.doc as jsPDF;
              // Footer with page numbers
              doc.setFontSize(8);
              doc.text(
                `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
                doc.internal.pageSize.width - 20,
                doc.internal.pageSize.height - 10,
                { align: 'right' }
              );
            },
          });

          // Grand total
          const finalY = (pdf as any).lastAutoTable?.finalY || 200;
          pdf.setFontSize(12).setFont('helvetica', 'bold');
          pdf.text(
            `Grand Total: ₹${quotation.total_cost.toLocaleString('en-IN')}`,
            pdf.internal.pageSize.width - 20,
            finalY + 15,
            { align: 'right' }
          );

          // Generate PDF with proper MIME type
          const pdfBlob = new Blob([pdf.output('arraybuffer')], { 
            type: 'application/pdf' 
          });
          
          downloadBlob(
            pdfBlob,
            `Quotation_${quotation.quotation_number}.pdf`
          );
          toast.success('PDF generated successfully');
          return;
        }

        /* ---------- normal server success path ---------- */
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }
        
        const blob = new Blob([await res.arrayBuffer()], { 
          type: 'application/pdf' 
        });
        downloadBlob(blob, `Quotation_${quotation.quotation_number}.pdf`);
        toast.success('PDF downloaded successfully');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to generate quotation PDF.');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /* ---------- 2.  TILES INVENTORY PDF ---------- */
  const generateTilesPDF = useCallback(
    async (tiles: TileData[]) => {
      setIsGenerating(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(
          `${supabaseUrl}/functions/v1/generate-tiles-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session?.access_token || ''}`,
            },
            body: JSON.stringify({ tiles }),
          }
        );

        const pdfFailed = res.headers.get('X-PDF-Generation-Failed');
        const contentType = res.headers.get('content-type') || '';

        if (pdfFailed && contentType.includes('text/html')) {
          console.warn('Server tiles PDF failed – using client fallback');
          const pdf = new jsPDF('p', 'mm', 'a4');

          pdf.setFontSize(18).setFont('helvetica', 'bold');
          pdf.text('TILES INVENTORY', 105, 25, { align: 'center' });
          
          pdf.setFontSize(10);
          pdf.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 40);
          pdf.text(`Total Tiles: ${tiles.length}`, 20, 48);

          const tableData = tiles.map((tile) => [
            tile.code,
            tile.name,
            `${tile.size_length} × ${tile.size_breadth}`,
            tile.price_per_box != null ? `₹${tile.price_per_box.toLocaleString('en-IN')}` : '-',
            tile.pieces_per_box?.toString() || '-'
          ]);

          autoTable(pdf, {
            startY: 58,
            head: [['Code', 'Name', 'Size (cm)', 'Price/Box', 'Pieces/Box']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
              fillColor: [52, 118, 235],
              textColor: [255, 255, 255],
              fontSize: 10,
              fontStyle: 'bold'
            },
            styles: { 
              fontSize: 9, 
              cellPadding: 2,
              lineColor: [128, 128, 128],
              lineWidth: 0.1
            },
            columnStyles: {
              0: { cellWidth: 25 }, // Code
              1: { cellWidth: 60 }, // Name
              2: { cellWidth: 25 }, // Size
              3: { halign: 'right', cellWidth: 30 }, // Price
              4: { halign: 'center', cellWidth: 20 }, // Pieces
            },
            margin: { left: 20, right: 20 },
            didDrawPage: (data) => {
              const doc = data.doc as jsPDF;
              doc.setFontSize(8);
              doc.text(
                `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
                doc.internal.pageSize.width - 20,
                doc.internal.pageSize.height - 10,
                { align: 'right' }
              );
            },
          });

          const pdfBlob = new Blob([pdf.output('arraybuffer')], { 
            type: 'application/pdf' 
          });
          downloadBlob(pdfBlob, 'Tiles-Inventory.pdf');
          toast.success('Tiles PDF generated successfully');
          return;
        }

        /* server OK */
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }
        
        const blob = new Blob([await res.arrayBuffer()], {
          type: 'application/pdf',
        });
        downloadBlob(blob, res.headers.get('X-Filename') || 'Tiles-Inventory.pdf');
        toast.success('Tiles PDF downloaded successfully');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to generate tiles PDF.');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generateQuotationPDF, generateTilesPDF, isGenerating };
};

// Legacy export alias for backward compatibility
export const useServerPDFGeneration = useUnifiedPDFGeneration;