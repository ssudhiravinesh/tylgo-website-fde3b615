
import { Grid3X3 } from "lucide-react";

export const EmptyTileState = () => {
  return (
    <div className="text-center py-12">
      <Grid3X3 className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">No tiles found</h3>
      <p className="text-muted-foreground">Try adjusting your search terms or scan a QR code</p>
    </div>
  );
};
