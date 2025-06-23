
import { Grid3X3 } from "lucide-react";

export const EmptyTileState = () => {
  return (
    <div className="text-center py-12">
      <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-600 mb-2">No tiles found</h3>
      <p className="text-gray-500">Try adjusting your search terms or scan a QR code</p>
    </div>
  );
};
