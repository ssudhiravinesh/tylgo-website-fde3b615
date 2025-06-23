
import { Quotation } from "@/hooks/useQuotations";
import { QuotationItem } from "@/hooks/useQuotationItems";

export const generateQuotationPDF = async (quotation: Quotation, items: QuotationItem[]): Promise<void> => {
  // Create PDF content
  const pdfContent = generatePDFContent(quotation, items);
  
  // Create a blob with the PDF content
  const blob = new Blob([pdfContent], { type: 'text/html' });
  
  // Create a temporary link to download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Quotation_${quotation.quotation_number}.html`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // In a real implementation, you'd use a proper PDF library like jsPDF or react-pdf
  console.log('PDF generated for quotation:', quotation.quotation_number);
};

const generatePDFContent = (quotation: Quotation, items: QuotationItem[]): string => {
  const currentDate = new Date().toLocaleDateString();
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Quotation ${quotation.quotation_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
        .quotation-title { font-size: 20px; margin: 10px 0; }
        .details-section { margin: 20px 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .detail-group { }
        .detail-label { font-weight: bold; color: #374151; }
        .detail-value { margin-bottom: 8px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
        .items-table th { background-color: #f3f4f6; font-weight: bold; }
        .total-section { text-align: right; margin: 20px 0; font-size: 18px; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">Tile Management System</div>
        <div class="quotation-title">QUOTATION</div>
        <div>Date: ${currentDate}</div>
    </div>
    
    <div class="details-section">
        <div class="details-grid">
            <div class="detail-group">
                <div class="detail-label">Quotation Number:</div>
                <div class="detail-value">${quotation.quotation_number}</div>
                
                <div class="detail-label">Status:</div>
                <div class="detail-value">${quotation.status.toUpperCase()}</div>
                
                <div class="detail-label">Created:</div>
                <div class="detail-value">${new Date(quotation.created_at).toLocaleDateString()}</div>
            </div>
            
            <div class="detail-group">
                <div class="detail-label">Customer Name:</div>
                <div class="detail-value">${quotation.customer?.name || 'N/A'}</div>
                
                <div class="detail-label">Mobile:</div>
                <div class="detail-value">${quotation.customer?.mobile || 'N/A'}</div>
                
                <div class="detail-label">Created By:</div>
                <div class="detail-value">${quotation.worker?.name || 'N/A'}</div>
            </div>
        </div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>S.No</th>
                <th>Room</th>
                <th>Tile</th>
                <th>Quantity (sqm)</th>
                <th>Unit Price (₹)</th>
                <th>Total (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.room?.name || 'N/A'}<br><small>${item.room?.length}×${item.room?.width} ${item.room?.unit}</small></td>
                    <td>${item.tile?.name || 'N/A'}<br><small>${item.tile?.code || ''}</small></td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unit_price.toLocaleString()}</td>
                    <td>₹${item.total_price.toLocaleString()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total-section">
        <div>Total Amount: ₹${quotation.total_cost?.toLocaleString() || '0'}</div>
    </div>
    
    ${quotation.notes ? `
        <div class="details-section">
            <div class="detail-label">Notes:</div>
            <div style="border: 1px solid #d1d5db; padding: 15px; background-color: #f9fafb; margin-top: 10px;">
                ${quotation.notes.replace(/\n/g, '<br>')}
            </div>
        </div>
    ` : ''}
    
    <div class="footer">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated quotation.</p>
    </div>
</body>
</html>
  `;
};
