import { useCallback } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const useExcelExport = () => {
  const exportTilesToExcel = useCallback((tiles: any[]) => {
    try {
      // Prepare data for Excel export
      const excelData = tiles.map((tile, index) => {
        // Calculate price per sq ft
        const calculatePricePerSqFt = () => {
          if (!tile.price_per_box || !tile.pieces_per_box || !tile.size_length || !tile.size_breadth) {
            return 'N/A';
          }
          const tileAreaSqm = (tile.size_length * tile.size_breadth) / 1000000; // Convert mm² to m²
          const areaPerBoxSqFt = (tileAreaSqm * tile.pieces_per_box) * 10.764; // Convert to sq ft
          return (tile.price_per_box / areaPerBoxSqFt).toFixed(2);
        };

        return {
          'S.No': index + 1,
          'Tile Code': tile.code || 'N/A',
          'Tile Name': tile.name || 'N/A',
          'Category': tile.category || 'N/A',
          'Size (Length mm)': tile.size_length || 'N/A',
          'Size (Breadth mm)': tile.size_breadth || 'N/A',
          'Size Display': tile.size_length && tile.size_breadth 
            ? `${tile.size_length} × ${tile.size_breadth} mm`
            : 'N/A',
          'Pieces per Box': tile.pieces_per_box || 'N/A',
          'Price per Box (₹)': tile.price_per_box ? `₹${tile.price_per_box}` : 'N/A',
          'Price per Sq Ft (₹)': `₹${calculatePricePerSqFt()}`,
          'Has QR Code': tile.qr_code_url ? 'Yes' : 'No',
          'Has Image': tile.image_url ? 'Yes' : 'No',
          'Created Date': tile.created_at ? new Date(tile.created_at).toLocaleDateString() : 'N/A',
          'Updated Date': tile.updated_at ? new Date(tile.updated_at).toLocaleDateString() : 'N/A'
        };
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better formatting
      const colWidths = [
        { wch: 6 },   // S.No
        { wch: 12 },  // Tile Code
        { wch: 25 },  // Tile Name
        { wch: 15 },  // Category
        { wch: 12 },  // Length
        { wch: 12 },  // Breadth
        { wch: 18 },  // Size Display
        { wch: 12 },  // Pieces per Box
        { wch: 15 },  // Price per Box
        { wch: 15 },  // Price per Sq Ft
        { wch: 12 },  // Has QR Code
        { wch: 12 },  // Has Image
        { wch: 12 },  // Created Date
        { wch: 12 }   // Updated Date
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