export const usePDFGeneration = () => {
  const generateQuotationPDF = useCallback(async (quotation: Quotation, wastagePercentage: number = 10) => {
    try {
      console.log('=== PDF Generation Debug Start ===');
      console.log('Quotation:', quotation);
      console.log('Wastage Percentage:', wastagePercentage);
      
      // API Call with better error handling
      const apiUrl = `https://onucizagpgwdpcakskat.supabase.co/rest/v1/quotation_items?quotation_id=eq.${quotation.id}&select=*,room:rooms(name,length,width,unit),tile:tiles(name,code,price_per_sqm,price_per_box,pieces_per_box,size_length,size_breadth)`;
      console.log('API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWNpemFncGd3ZHBjYWtza2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODA0NDUsImV4cCI6MjA2NjE1NjQ0NX0.c7Ihw4a38Xa37ygQyF1sjiApLsayTQLvs5QvPtsIozM',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWNpemFncGd3ZHBjYWtza2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODA0NDUsImV4cCI6MjA2NjE1NjQ0NX0.c7Ihw4a38Xa37ygQyF1sjiApLsayTQLvs5QvPtsIozM',
          'Content-Type': 'application/json'
        }
      });

      console.log('Response Status:', response.status);
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch quotation items: ${response.status} - ${errorText}`);
      }

      const quotationItems = await response.json();
      console.log('Raw API Response:', quotationItems);
      console.log('Items Count:', quotationItems?.length || 0);

      // Debug each item structure
      if (quotationItems && quotationItems.length > 0) {
        quotationItems.forEach((item, index) => {
          console.log(`=== Item ${index + 1} Debug ===`);
          console.log('Full Item:', item);
          console.log('Room Data:', item.room);
          console.log('Tile Data:', item.tile);
          console.log('Quantity:', item.quantity);
          console.log('Unit Price:', item.unit_price);
        });
      } else {
        console.warn('No quotation items found or empty response');
      }

      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Generate items rows with enhanced debugging
      let itemsRows = '';
      let totalBoxes = 0;
      let grandTotal = 0;
      
      if (quotationItems && quotationItems.length > 0) {
        itemsRows = quotationItems.map((item: any, index: number) => {
          console.log(`=== Processing Item ${index + 1} for PDF ===`);
          
          const room = item.room;
          const tile = item.tile;
          
          console.log('Room object:', room);
          console.log('Tile object:', tile);
          
          // Room details with better error handling
          let roomDetails = 'N/A';
          let areaInSqFt = 'N/A';
          let effectiveAreaInSqFt = 'N/A';
          
          if (room) {
            console.log('Room data available:', {
              name: room.name,
              length: room.length,
              width: room.width,
              unit: room.unit
            });
            
            if (room.length && room.width && room.unit) {
              try {
                const areaSqFt = calculateAreaInSquareFeet(room.length, room.width, room.unit);
                const effectiveArea = areaSqFt * (1 + (wastagePercentage / 100));
                roomDetails = formatDimensions(room.length, room.width, room.unit);
                areaInSqFt = formatArea(areaSqFt);
                effectiveAreaInSqFt = formatArea(effectiveArea);
                console.log('Calculated areas:', { areaSqFt, effectiveArea });
              } catch (error) {
                console.error('Error calculating room area:', error);
              }
            } else {
              console.warn('Missing room dimensions:', { length: room.length, width: room.width, unit: room.unit });
            }
          } else {
            console.warn('No room data available for item');
          }

          // Tile details with better error handling
          let tileDimensions = 'N/A';
          if (tile) {
            console.log('Tile data available:', {
              name: tile.name,
              code: tile.code,
              size_length: tile.size_length,
              size_breadth: tile.size_breadth,
              price_per_box: tile.price_per_box,
              pieces_per_box: tile.pieces_per_box
            });
            
            if (tile.size_length && tile.size_breadth) {
              const lengthInMm = parseFloat(tile.size_length) || 0;
              const widthInMm = parseFloat(tile.size_breadth) || 0;
              
              if (lengthInMm >= 1000 || widthInMm >= 1000) {
                const lengthInM = (lengthInMm / 1000).toFixed(2);
                const widthInM = (widthInMm / 1000).toFixed(2);
                tileDimensions = `${lengthInM} × ${widthInM} m`;
              } else if (lengthInMm >= 100 || widthInMm >= 100) {
                const lengthInCm = (lengthInMm / 10).toFixed(1);
                const widthInCm = (widthInMm / 10).toFixed(1);
                tileDimensions = `${lengthInCm} × ${widthInCm} cm`;
              } else {
                tileDimensions = `${lengthInMm} × ${widthInMm} mm`;
              }
              console.log('Calculated tile dimensions:', tileDimensions);
            } else {
              console.warn('Missing tile dimensions:', { size_length: tile.size_length, size_breadth: tile.size_breadth });
            }
          } else {
            console.warn('No tile data available for item');
          }

          // Calculate quantities and pricing
          const originalQuantity = parseFloat(item.quantity) || 0;
          const effectiveQuantity = originalQuantity * (1 + (wastagePercentage / 100));
          const unitPrice = parseFloat(item.unit_price) || 0;
          const totalPrice = effectiveQuantity * unitPrice;
          grandTotal += totalPrice;

          console.log('Quantity calculations:', {
            originalQuantity,
            effectiveQuantity,
            unitPrice,
            totalPrice
          });

          // Calculate boxes needed
          let boxesNeeded = 0;
          let boxPricing = '';
          if (tile && tile.price_per_box && tile.pieces_per_box) {
            const tileLengthFt = (parseFloat(tile.size_length) || 0) / 304.8;
            const tileWidthFt = (parseFloat(tile.size_breadth) || 0) / 304.8;
            const tileAreaSqFt = tileLengthFt * tileWidthFt;
            
            if (tileAreaSqFt > 0) {
              const tilesNeeded = Math.ceil(effectiveQuantity / tileAreaSqFt);
              boxesNeeded = Math.ceil(tilesNeeded / tile.pieces_per_box);
              totalBoxes += boxesNeeded;
              console.log('Box calculations:', { tileAreaSqFt, tilesNeeded, boxesNeeded });
            }
            
            boxPricing = `<small style="color: #666; font-size: 9px;">₹${parseFloat(tile.price_per_box).toLocaleString('en-IN')} per box (${tile.pieces_per_box} pcs)</small><br/>`;
          }

          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>${room?.name || 'Unknown Room'}</strong><br/>
                <small style="color: #666; font-size: 9px;">Dim: ${roomDetails}</small><br/>
                <small style="color: #666; font-size: 9px;">Original: ${areaInSqFt}</small><br/>
                ${wastagePercentage > 0 ? `<small style="color: #d97706; font-size: 9px;">Effective: ${effectiveAreaInSqFt}</small>` : ''}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                <strong>${tile?.name || 'Unknown Tile'}</strong><br/>
                <small style="color: #666; font-size: 9px;">Code: ${tile?.code || 'N/A'}</small><br/>
                <small style="color: #666; font-size: 9px;">Size: ${tileDimensions}</small><br/>
                ${boxPricing}
              </td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">
                ${effectiveQuantity.toFixed(2)} sq ft
                ${wastagePercentage > 0 ? `<br/><small style="color: #d97706; font-size: 8px;">(+${wastagePercentage}% wastage)</small>` : ''}
              </td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">${tile?.pieces_per_box || 'N/A'}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">${boxesNeeded || 'N/A'}</td>
              <td style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top;">₹${totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        }).join('');
      } else {
        console.warn('No items to process - showing empty message');
        itemsRows = '<tr><td colspan="7" class="no-items">No items found in this quotation</td></tr>';
      }

      console.log('Final calculations:', { totalBoxes, grandTotal });
      console.log('=== PDF Generation Debug End ===');

      // Rest of your PDF generation code...
      // (HTML content generation remains the same)
      
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('=== PDF Generation Error ===', error);
      console.error('Error stack:', error.stack);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  }, []);

  return { generateQuotationPDF };
};