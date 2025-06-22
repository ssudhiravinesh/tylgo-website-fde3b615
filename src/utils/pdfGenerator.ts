
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface QuotationPDFData {
  quotation_number: string;
  created_at: string;
  status: string;
  total_cost: number;
  notes?: string;
  customer: {
    name: string;
    mobile: string;
    address?: string;
  };
  worker: {
    name: string;
  };
  quotation_items: Array<{
    tile: {
      name: string;
      code: string;
      size_length: number;
      size_breadth: number;
    };
    room: {
      name: string;
    };
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export const generateQuotationPDF = (quotation: QuotationPDFData) => {
  const doc = new jsPDF();
  
  // Company Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('TILE QUOTATION', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Professional Tile Installation Services', 105, 28, { align: 'center' });
  
  // Quotation Info
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Quotation #: ${quotation.quotation_number}`, 20, 45);
  doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, 20, 52);
  doc.text(`Status: ${quotation.status.toUpperCase()}`, 20, 59);
  
  // Customer Information
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('CUSTOMER INFORMATION', 20, 75);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 77, 190, 77);
  
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Name: ${quotation.customer.name}`, 20, 85);
  doc.text(`Mobile: ${quotation.customer.mobile}`, 20, 92);
  if (quotation.customer.address) {
    doc.text(`Address: ${quotation.customer.address}`, 20, 99);
  }
  
  // Prepared by
  doc.text(`Prepared by: ${quotation.worker.name}`, 120, 85);
  
  // Items Table
  const tableStartY = quotation.customer.address ? 110 : 105;
  
  const tableData = quotation.quotation_items.map(item => [
    item.tile.name,
    item.tile.code,
    item.room.name,
    `${item.tile.size_length}" × ${item.tile.size_breadth}"`,
    item.quantity.toString(),
    `₹${item.unit_price.toLocaleString()}`,
    `₹${item.total_price.toLocaleString()}`
  ]);
  
  doc.autoTable({
    startY: tableStartY,
    head: [['Tile Name', 'Code', 'Room', 'Size', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });
  
  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`TOTAL AMOUNT: ₹${quotation.total_cost.toLocaleString()}`, 190, finalY, { align: 'right' });
  
  // Notes
  if (quotation.notes) {
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text('NOTES', 20, finalY + 15);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, finalY + 17, 190, finalY + 17);
    
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const splitNotes = doc.splitTextToSize(quotation.notes, 170);
    doc.text(splitNotes, 20, finalY + 25);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });
  doc.text('This is a computer-generated quotation.', 105, pageHeight - 15, { align: 'center' });
  
  // Save the PDF
  doc.save(`Quotation-${quotation.quotation_number}.pdf`);
};
