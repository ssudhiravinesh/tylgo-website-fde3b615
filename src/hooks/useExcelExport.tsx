import { useCallback } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const useExcelExport = () => {
  const exportTilesToExcel = useCallback((tiles: any[]) => {
    try {
      // Prepare simplified data for Excel export
      const excelData = tiles.map((tile) => ({

        'Tile Code': tile.code || 'N/A',
        'Category': tile.category || 'N/A',
        'Size': tile.size_length && tile.size_breadth
          ? `${tile.size_length} × ${tile.size_breadth} mm`
          : 'N/A',
        'Price per Box (₹)': tile.price_per_box ? `₹${tile.price_per_box}` : 'N/A'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better formatting
      const colWidths = [
        { wch: 30 },  // Tile Name
        { wch: 15 },  // Tile Code
        { wch: 20 },  // Category
        { wch: 20 },  // Size
        { wch: 18 }   // Price per Box
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Tiles Catalog');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `tiles-catalog-${currentDate}.xlsx`;

      // Save the file
      XLSX.writeFile(wb, filename);

      toast.success(`Excel file downloaded successfully: ${filename}`);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export to Excel. Please try again.');
    }
  }, []);

  const exportCustomersToExcel = useCallback((customers: any[]) => {
    try {
      const excelData = customers.map((customer, index) => ({
        'S.No': index + 1,
        'Customer Name': customer.name || 'N/A',
        'Mobile Number': customer.mobile || 'N/A',
        'Reference Name': customer.reference_name || 'N/A',
        'Reference Mobile': customer.reference_mobile_no || 'N/A',
        'Address': customer.address || 'N/A',
        'Area': customer.area || 'N/A',
        'State': customer.state || 'N/A',
        'Pincode': customer.pincode || 'N/A',
        'Category': customer.category || 'N/A',
        'Attended By': customer.profiles?.name || 'N/A',
        'Created Date': customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A',
        'Updated Date': customer.updated_at ? new Date(customer.updated_at).toLocaleDateString() : 'N/A'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = [
        { wch: 6 },   // S.No
        { wch: 20 },  // Customer Name
        { wch: 15 },  // Mobile
        { wch: 20 },  // Reference Name
        { wch: 15 },  // Reference Mobile
        { wch: 30 },  // Address
        { wch: 15 },  // Area
        { wch: 15 },  // State
        { wch: 10 },  // Pincode
        { wch: 12 },  // Category
        { wch: 15 },  // Attended By
        { wch: 12 },  // Created Date
        { wch: 12 }   // Updated Date
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Customers');

      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `customers-database-${currentDate}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Excel file downloaded successfully: ${filename}`);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export to Excel. Please try again.');
    }
  }, []);

  const exportQuotationsToExcel = useCallback((quotations: any[]) => {
    try {
      const excelData = quotations.map((quotation, index) => ({
        'S.No': index + 1,
        'Quotation Number': quotation.quotation_number || 'N/A',
        'Customer Name': quotation.customer?.name || 'N/A',
        'Customer Mobile': quotation.customer?.mobile || 'N/A',
        'Worker Name': quotation.worker?.name || 'N/A',
        'Status': quotation.status || 'N/A',
        'Total Cost (₹)': quotation.total_cost ? `₹${quotation.total_cost}` : 'N/A',
        'Wastage %': quotation.wastage_percentage || '0',
        'Notes': quotation.notes || 'N/A',
        'Created Date': quotation.created_at ? new Date(quotation.created_at).toLocaleDateString() : 'N/A',
        'Updated Date': quotation.updated_at ? new Date(quotation.updated_at).toLocaleDateString() : 'N/A'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = [
        { wch: 6 },   // S.No
        { wch: 18 },  // Quotation Number
        { wch: 20 },  // Customer Name
        { wch: 15 },  // Customer Mobile
        { wch: 15 },  // Worker Name
        { wch: 10 },  // Status
        { wch: 15 },  // Total Cost
        { wch: 10 },  // Wastage %
        { wch: 30 },  // Notes
        { wch: 12 },  // Created Date
        { wch: 12 }   // Updated Date
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Quotations');

      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `quotations-${currentDate}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Excel file downloaded successfully: ${filename}`);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export to Excel. Please try again.');
    }
  }, []);

  return {
    exportTilesToExcel,
    exportCustomersToExcel,
    exportQuotationsToExcel
  };
};