// import { useCallback, useState } from 'react';
// import { toast } from 'sonner';
// import { supabase } from '@/integrations/supabase/client';
// import type { Quotation } from '@/hooks/useQuotations';

// interface TileData {
//   id: string;
//   code: string;
//   name: string;
//   category?: string; // Make optional to match Tile interface
//   size_length: number;
//   size_breadth: number;
//   price_per_box?: number | null; // Make optional to match Tile interface
//   pieces_per_box?: number | null; // Make optional to match Tile interface
// }

// export const useServerPDFGeneration = () => {
//   const [isGenerating, setIsGenerating] = useState(false);
//   const supabaseUrl = 'https://onucizagpgwdpcakskat.supabase.co';
  
//   const generateQuotationPDF = useCallback(
//     async (quotation: Quotation) => {
//       setIsGenerating(true);
//       try {
//         const { data: session } = await supabase.auth.getSession();
//         const response = await fetch(
//           `${supabaseUrl}/functions/v1/generate-quotation-pdf`,
//           {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Bearer ${session.session?.access_token || ''}`,
//             },
//             body: JSON.stringify({
//               quotation,
//             }),
//           },
//         );

//         if (!response.ok) {
//           const { error } = await response.json();
//           throw new Error(error || `HTTP ${response.status}`);
//         }
//       // Check if server-side PDF generation failed and returned HTML instead
//       const contentType = response.headers.get('content-type');
//       const pdfGenerationFailed = response.headers.get('X-PDF-Generation-Failed');
      
//       if (pdfGenerationFailed && contentType?.includes('text/html')) {
//         console.log('Server-side PDF generation failed, falling back to client-side generation');
//         const html = await response.text();
        
//         // Import jsPDF for client-side fallback
//         const { jsPDF } = await import('jspdf');
//         const pdf = new jsPDF('p', 'mm', 'a4');
        
//         // Create a simple text-based PDF as fallback
//         pdf.setFontSize(16);
//         pdf.text(`Quotation ${quotation.quotation_number}`, 20, 20);
//         pdf.setFontSize(12);
//         pdf.text(`Customer: ${quotation.customer.name}`, 20, 35);
//         pdf.text(`Mobile: ${quotation.customer.mobile}`, 20, 45);
//         pdf.text(`Total: ₹${quotation.total_cost.toLocaleString('en-IN')}`, 20, 55);
//         pdf.text('Generated using client-side fallback', 20, 270);
        
//         const pdfBlob = pdf.output('blob');
//         const url = window.URL.createObjectURL(pdfBlob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `Quotation_${quotation.quotation_number}.pdf`;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         window.URL.revokeObjectURL(url);
        
//         toast.success('PDF generated using client-side fallback');
//         return;
//       }

//       // Handle PDF blob response
//  const fileBlob = await response.blob();
//         const url = URL.createObjectURL(fileBlob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `Quotation_${quotation.quotation_number}.pdf`;
//         document.body.appendChild(link);
//         link.click();
//         link.remove();
//         URL.revokeObjectURL(url);

//         toast.success('PDF generated and downloaded successfully!');
//       } catch (err: any) {
//         console.error(err);
//         toast.error(err.message || 'Failed to generate PDF.');
//       } finally {
//         setIsGenerating(false);
//       }
//     },
//     [supabaseUrl],
//   );

//   const generateTilesPDF = useCallback(async (tiles: TileData[]) => {
//     setIsGenerating(true);
//     try {
//       console.log('Starting server-side tiles PDF generation for', tiles.length, 'tiles');

//       const response = await fetch(`${supabaseUrl}/functions/v1/generate-tiles-pdf`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
//         },
//         body: JSON.stringify({ tiles }),
//       });

//       if (!response.ok) {
//         let errorMessage = `Failed to generate tiles PDF (${response.status})`;
//         try {
//           const errorData = await response.json();
//           errorMessage = errorData.error || errorMessage;
//         } catch {
//           errorMessage = response.statusText || errorMessage;
//         }
//         throw new Error(errorMessage);
//       }

//       // Check if server-side PDF generation failed and returned HTML instead
//       const contentType = response.headers.get('content-type');
//       const pdfGenerationFailed = response.headers.get('X-PDF-Generation-Failed');
//       const filename = response.headers.get('X-Filename');
      
//       if (pdfGenerationFailed && contentType?.includes('text/html')) {
//         console.log('Server-side tiles PDF generation failed, falling back to client-side generation');
        
//         // Import jsPDF for client-side fallback
//         const { jsPDF } = await import('jspdf');
//         const pdf = new jsPDF('p', 'mm', 'a4');
        
//         // Create a simple text-based PDF as fallback
//         pdf.setFontSize(16);
//         pdf.text('Tiles Inventory Report', 20, 20);
//         pdf.setFontSize(12);
//         pdf.text(`Total Tiles: ${tiles.length}`, 20, 35);
        
//         // Add tiles data in simple format
//         let yPosition = 50;
//         tiles.slice(0, 20).forEach((tile, index) => { // Limit to first 20 tiles
//           if (yPosition > 270) return; // Avoid overflow
//           pdf.text(`${index + 1}. ${tile.name} (${tile.code})`, 20, yPosition);
//           yPosition += 10;
//         });
        
//         if (tiles.length > 20) {
//           pdf.text(`... and ${tiles.length - 20} more tiles`, 20, yPosition);
//         }
        
//         pdf.text('Generated using client-side fallback', 20, 280);
        
//         const pdfBlob = pdf.output('blob');
//         const url = window.URL.createObjectURL(pdfBlob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = filename || `Tiles-Inventory-${new Date().toISOString().slice(0, 10)}.pdf`;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         window.URL.revokeObjectURL(url);
        
//         toast.success('Tiles PDF generated using client-side fallback');
//         return;
//       }

//       // Handle PDF blob response
//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       const timestamp = new Date().toISOString().slice(0, 10);
//       link.download = `Tiles-Inventory-${timestamp}.pdf`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);

//       toast.success('Tiles PDF generated and downloaded successfully!');
//       console.log('Server-side tiles PDF generation completed successfully');

//     } catch (error: any) {
//       console.error('Tiles PDF generation failed:', error);
//       toast.error(error.message || 'Failed to generate tiles PDF. Please try again.');
//     } finally {
//       setIsGenerating(false);
//     }
//   }, [supabaseUrl]);

//    return { generateQuotationPDF, generateTilesPDF, isGenerating };
// };



// useUnifiedPDFGeneration.tsx
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
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/* Produce AutoTable rows from Quotation line-items */
const quotationRows = (quotation: Quotation) =>
  quotation.items.map((row) => ({
    room: row.room_label,
    tileCode: row.tile.code,
    size: `${row.tile.size_length} × ${row.tile.size_breadth}`,
    boxes: row.boxes,
    pricePerBox: `₹${row.tile.price_per_box?.toLocaleString('en-IN') ?? ''}`,
    total: `₹${row.total_cost.toLocaleString('en-IN')}`,
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
          pdf.setFontSize(16).setFont('helvetica', 'bold');
          pdf.text('Tile Solutions – Quotation', 105, 20, { align: 'center' });

          pdf.setFontSize(11).setFont('helvetica', 'normal');
          pdf.text(`Quotation #: ${quotation.quotation_number}`, 14, 32);
          pdf.text(
            `Date: ${new Date(quotation.created_at).toLocaleDateString()}`,
            14,
            39
          );
          pdf.text(`Customer: ${quotation.customer.name}`, 14, 46);
          pdf.text(`Mobile: ${quotation.customer.mobile}`, 14, 53);

          // Table
          autoTable(pdf, {
            startY: 62,
            head: [
              [
                'Room / Area',
                'Tile Code',
                'Size (cm)',
                'Boxes',
                'Price / Box',
                'Line Total',
              ],
            ],
            body: quotationRows(quotation),
            theme: 'grid',
            headStyles: { fillColor: [52, 118, 235] },
            styles: { cellPadding: 2, fontSize: 10 },
            columnStyles: {
              room: { cellWidth: 50 },
              tileCode: { cellWidth: 25 },
              size: { cellWidth: 25 },
              boxes: { halign: 'right', cellWidth: 20 },
              pricePerBox: { halign: 'right', cellWidth: 28 },
              total: { halign: 'right', cellWidth: 28 },
            },
            didDrawPage: ({ doc, pageNumber, pageCount }) => {
              doc.setFontSize(8);
              doc.text(
                `Page ${pageNumber} of ${pageCount}`,
                200,
                287,
                { align: 'right' }
              );
            },
          });

          pdf.setFontSize(12).setFont('helvetica', 'bold');
          pdf.text(
            `Grand Total: ₹${quotation.total_cost.toLocaleString('en-IN')}`,
            200,
            pdf.lastAutoTable.finalY + 10,
            { align: 'right' }
          );

          const blob = pdf.output('blob');
          downloadBlob(
            blob,
            `Quotation_${quotation.quotation_number}.pdf`
          );
          toast.success('PDF created on client');
          return;
        }

        /* ---------- normal server success path ---------- */
        const blob = await res.blob(); // response already application/pdf
        downloadBlob(blob, `Quotation_${quotation.quotation_number}.pdf`);
        toast.success('PDF downloaded');
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

          pdf.setFontSize(16).setFont('helvetica', 'bold');
          pdf.text('Tiles Inventory', 105, 20, { align: 'center' });

          const rows = tiles.map((t) => ({
            code: t.code,
            name: t.name,
            size: `${t.size_length} × ${t.size_breadth}`,
            price:
              t.price_per_box != null
                ? `₹${t.price_per_box.toLocaleString('en-IN')}`
                : '-',
            pcs: t.pieces_per_box ?? '-',
          }));

          autoTable(pdf, {
            startY: 30,
            head: [['Code', 'Name', 'Size (cm)', 'Price / Box', 'Pieces / Box']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [52, 118, 235] },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
              code: { cellWidth: 24 },
              name: { cellWidth: 60 },
              size: { cellWidth: 24 },
              price: { halign: 'right', cellWidth: 28 },
              pcs: { halign: 'right', cellWidth: 24 },
            },
            didDrawPage: ({ doc, pageNumber, pageCount }) => {
              doc.setFontSize(8);
              doc.text(
                `Page ${pageNumber} of ${pageCount}`,
                200,
                287,
                { align: 'right' }
              );
            },
          });

          const blob = pdf.output('blob');
          downloadBlob(blob, 'Tiles-Inventory.pdf');
          toast.success('Tiles PDF created on client');
          return;
        }

        /* server OK */
        const blob = new Blob([await res.arrayBuffer()], {
          type: 'application/pdf',
        });
        downloadBlob(blob, res.headers.get('X-Filename') || 'Tiles-Inventory.pdf');
        toast.success('Tiles PDF downloaded');
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
